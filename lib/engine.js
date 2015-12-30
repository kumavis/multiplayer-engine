const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits
const extend = require('xtend')
const merge = require('merge').recursive
const Network = require('../lib/network.js')
const StateMachine = require('./sm.js')
const TICK_RATE = 0.3 /100
const BROADCAST_RATE = 1 /100

module.exports = Engine

inherits(Engine, EventEmitter)

function Engine(opts){  
  opts = opts || {}
  const self = this
  EventEmitter.call(self)

  var stateTransitionFn = opts.stateTransitionFn

  //
  // state
  //
  
  self.stateMachine = new StateMachine(stateTransitionFn)

  //
  // networking
  //

  var network = self.network = new Network({
    type: opts.networkType,
    peerTypes: ['client', 'server'],
  })

  // network message pubsub
  // self.messages = new EventEmitter()

  network.on('connect:client', function(peer){
    self.emit('join', peer)
    _debug('client joined:',peer.id)
    // self.createActionSet({ clientId: peer.id }, { join: true })
  })

  network.on('leave:client', function(peer){
    self.emit('leave', peer)
    _debug('client left:',peer.id)
    // self.createActionSet({ clientId: peer.id }, { leave: true })
  })

  network.once('connect:server', function(peer){
    self.emit('connected', peer)
    _debug('joined server:',peer.id)
    // self.createActionSet({ clientId: peer.id }, { join: true })
  })

  // network.on('message', function(peer, message){
  //   // _debug(peer.id+':', message)
  //   if (!message.type) return
  //   self.messages.emit(message.type, { clientId: peer.id }, message)
  // })

}

Engine.prototype.start = function(){
  const self = this
  var stateMachine = self.stateMachine

  _debug('-- start! --')

  setInterval(onTick, 1/TICK_RATE)
  setInterval(broadcastUpdate, 1/BROADCAST_RATE)

  function onTick(){
    stateMachine.nextTick()
    stateMachine.setActionFrame(newActionFrame())
    self.emit('tick')
    // simulate as much as possible now
    stateMachine.run()
    // debug
    var gameState = stateMachine.getState()
    _debug('step:', gameState)
  }

  function broadcastUpdate() {
    self.emit('broadcast')
  }
}

Engine.prototype.addAuthoritativeAction = function(client, action, tick) {
  const self = this
  if (tick === undefined) tick = self.stateMachine.getCurrentTick()
  var prevActionFrame = self.stateMachine.getAuthoritativeAction(tick)
  var newActionFrame = merge(prevActionFrame, { server: action })
  self.stateMachine.putAuthoritativeAction(tick, action)
}

// Engine.prototype.createActionSet = function(meta, actionSet){
//   const self = this
//   var tick = self.stateMachine.currentTick
//   _debug('importActionSet:', meta, tick, actionSet)
//   self.importActionSet(meta.clientId, actionSet, tick)
// }

// Engine.prototype.broadcastNodeActionHistory = function(clientId){
//   const self = this
//   var actions = self.stateMachine.getActionHistory()[clientId] || {}
//   var actionHistory = {
//     startTick: self.stateMachine.currentTick,
//     actions: actions,
//   }
//   self.network.broadcast({
//     type: 'actionHistory',
//     actionHistory: actionHistory,
//   })
//   // _debug('broadcast:', actionHistory)
// }

// Engine.prototype.broadcastRootActionHistory = function(){
//   const self = this
//   var actionHistory = {
//     startTick: self.stateMachine.currentTick,
//     actions: self.stateMachine.getActionHistory(),
//   }
//   self.network.broadcast({
//     type: 'actionHistory',
//     actionHistory: actionHistory,
//   })
//   // _debug('broadcast:', actionHistory)
// }

// imports an ActionHistory from a peer
Engine.prototype.importActionSetHistory = function(meta, message){
  var actionHistory = message.actionHistory
}

Engine.prototype.importActionSetHistory = function(clientId, actionHistory){
  const self = this
  // _debug('actionHistory:', actionHistory)
  actionHistory.actions.forEach(function eachAction(actionFrame, index){
    if (!actionFrame) return null
    var tick = actionHistory.startTick + index
    var actionSet = actionFrame.clients[clientId]
    self.importActionSet(clientId, actionSet, tick)
  })
}

// imports an ActionSet from a peer, and adds it to the ActionFrame
Engine.prototype.importActionSet = function(clientId, action, tick){
  const self = this
  
  // _debug('import - action:', action)

  // validate actions
  if (!action) return
  // validate action is within sliding window
  // _debug('import - action - tick:', tick, self.stateMachine.currentTick, self.stateMachine.tickInWindow(tick))
  if (!self.stateMachine.tickInWindow(tick)) return
  // TODO: validate entity ownership
  
  // dedupe (dont apply action already received from user for frame)
  var actionFrame = self.stateMachine.getActionFrame(tick)
  // _debug('import - action - exist:', actionFrame.clients[clientId])
  if (actionFrame.clients[clientId]) return

  // update action frame
  actionFrame.clients[clientId] = action
  // _debug('import action:', actionFrame.clients[clientId])
  self.stateMachine.setActionFrame(actionFrame, tick)
}

Engine.prototype.broadcastSnapshot = function(){
  const self = this
  var snapshot = {
    state: self.stateMachine.getState(),
    tick: self.stateMachine.currentTick,
  }
  self.network.broadcast({
    type: 'stateSnapshot',
    snapshot: snapshot,
  })
  // _debug('broadcast:', snapshot)
}

Engine.prototype.importSnapshot = function(meta, message){
  const self = this
  var state = message.snapshot.state
  var tick = message.snapshot.tick
  self.stateMachine.setState(state, tick)
  _debug('import snapshot:', tick)
}

function initialGameState(){
  return {
    players: {}
  }
}

function _debug(){
  console.log.apply(console, arguments)
}