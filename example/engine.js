const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits
const extend = require('xtend')
const Network = require('../lib/network.js')
const StateManager = require('../lib/state-manager.js')
const applyActions = require('./actions.js')
const TICK_RATE = 0.3 /100
const BROADCAST_RATE = 1 /100

module.exports = Engine

inherits(Engine, EventEmitter)

function Engine(opts){
  const self = this
  opts = opts || {}

  EventEmitter.call(self)

  //
  // state
  //
  
  var stateManager = self.stateManager = new StateManager(applyActions)
  stateManager.setState(initialGameState())

  //
  // networking
  //

  var network = self.network = new Network({
    isServer: opts.isServer,
  })

  // network message pubsub
  self.messages = new EventEmitter()

  network.on('join', function(peer){
    console.log('client joined:',peer.id)
    self.createActionSet({ clientId: peer.id }, { join: true })
  })

  network.on('leave', function(peer){
    console.log('client left:',peer.id)
    self.createActionSet({ clientId: peer.id }, { leave: true })
  })

  network.on('message', function(peer, message){
    // console.log(peer.id+':', message)
    if (!message.type) return
    self.messages.emit(message.type, { clientId: peer.id }, message)
  })

}

Engine.prototype.start = function(){
  const self = this
  var stateManager = self.stateManager

  console.log('-- start! --')

  setInterval(onTick, 1/TICK_RATE)
  setInterval(broadcastUpdate, 1/BROADCAST_RATE)

  function onTick(){
    stateManager.nextTick()
    stateManager.setActionFrame(newActionFrame())
    self.emit('tick')
    // simulate as much as possible now
    stateManager.run()
    // debug
    var gameState = stateManager.getState()
    console.log('step:', gameState)
  }

  function broadcastUpdate() {
    self.emit('broadcast')
  }
}

// Engine.prototype.createActionSet = function(meta, actionSet){
//   const self = this
//   var tick = self.stateManager.currentTick
//   console.log('importActionSet:', meta, tick, actionSet)
//   self.importActionSet(meta.clientId, actionSet, tick)
// }

// Engine.prototype.broadcastNodeActionHistory = function(clientId){
//   const self = this
//   var actions = self.stateManager.getActionHistory()[clientId] || {}
//   var actionHistory = {
//     startTick: self.stateManager.currentTick,
//     actions: actions,
//   }
//   self.network.broadcast({
//     type: 'actionHistory',
//     actionHistory: actionHistory,
//   })
//   // console.log('broadcast:', actionHistory)
// }

// Engine.prototype.broadcastRootActionHistory = function(){
//   const self = this
//   var actionHistory = {
//     startTick: self.stateManager.currentTick,
//     actions: self.stateManager.getActionHistory(),
//   }
//   self.network.broadcast({
//     type: 'actionHistory',
//     actionHistory: actionHistory,
//   })
//   // console.log('broadcast:', actionHistory)
// }

// imports an ActionHistory from a peer
Engine.prototype.importActionSetHistory = function(meta, message){
  var actionHistory = message.actionHistory
}

Engine.prototype.importActionSetHistory = function(clientId, actionHistory){
  const self = this
  // console.log('actionHistory:', actionHistory)
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
  
  // console.log('import - action:', action)

  // validate actions
  if (!action) return
  // validate action is within sliding window
  // console.log('import - action - tick:', tick, self.stateManager.currentTick, self.stateManager.tickInWindow(tick))
  if (!self.stateManager.tickInWindow(tick)) return
  // TODO: validate entity ownership
  
  // dedupe (dont apply action already received from user for frame)
  var actionFrame = self.stateManager.getActionFrame(tick)
  // console.log('import - action - exist:', actionFrame.clients[clientId])
  if (actionFrame.clients[clientId]) return

  // update action frame
  actionFrame.clients[clientId] = action
  // console.log('import action:', actionFrame.clients[clientId])
  self.stateManager.setActionFrame(actionFrame, tick)
}

Engine.prototype.broadcastSnapshot = function(){
  const self = this
  var snapshot = {
    state: self.stateManager.getState(),
    tick: self.stateManager.currentTick,
  }
  self.network.broadcast({
    type: 'stateSnapshot',
    snapshot: snapshot,
  })
  // console.log('broadcast:', snapshot)
}

Engine.prototype.importSnapshot = function(meta, message){
  const self = this
  var state = message.snapshot.state
  var tick = message.snapshot.tick
  self.stateManager.setState(state, tick)
  console.log('import snapshot:', tick)
}

function initialGameState(){
  return {
    players: {}
  }
}