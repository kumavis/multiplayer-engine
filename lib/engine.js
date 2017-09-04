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

  var stateTransitionFn = function(state, actionFrame, cb){
    var tick = state.tick || 0
    tick++
    state.tick = tick
    opts.stateTransitionFn(state, actionFrame, cb)
  }

  //
  // state
  //
  
  self.stateMachine = new StateMachine(stateTransitionFn)
  self.stateMachine.putState(opts.initialState.tick || 0, opts.initialState)

  //
  // networking
  //

  var network = self.network = new Network({
    type: opts.networkType,
    peerTypes: ['client', 'server'],
  })

  network.on('connect:client', function(peer){
    _debug('client joined:',peer.id)
    self.emit('join', peer)
    // self.createActionSet({ clientId: peer.id }, { join: true })
  })

  network.on('leave:client', function(peer){
    _debug('client left:',peer.id)
    self.emit('leave', peer)
    // self.createActionSet({ clientId: peer.id }, { leave: true })
  })

  network.once('connect:server', function(peer){
    _debug('joined server:',peer.id)
    self.emit('connected', peer)
    self.network.messages.once('server:snapshot', function onInitialSnapshot(peer, snapshot){
      self.importSnapshot(snapshot)
      self.emit('ready')
    })
  })

}

Engine.prototype.addAuthoritativeAction = function(action, tick) {
  const self = this
  if (tick === undefined) tick = self.stateMachine.getCurrentTick()
  var prevActionFrame = self.stateMachine.getAuthoritativeAction(tick)
  var newActionFrame = merge(prevActionFrame, action)
  _debug('addAuthoritativeAction:', action, newActionFrame)
  self.stateMachine.putAuthoritativeAction(tick, newActionFrame)
}

Engine.prototype.addOptimisticAction = function(action, tick) {
  const self = this
  if (tick === undefined) tick = self.stateMachine.getCurrentTick()
  var prevActionFrame = self.stateMachine.getOptimisticAction(tick)
  var newActionFrame = merge(prevActionFrame, action)
  _debug('addOptimisticAction:', action, newActionFrame)
  self.stateMachine.putOptimisticAction(tick, newActionFrame)
}

Engine.prototype.importClientActionHistory = function(peer, data){
  const self = this
  _debug('importClientActionHistory:', peer.id, data.startTick, '->', data.startTick+data.history.length-1)
  data.history.forEach(function(action, index){
    var tick = data.startTick+index
    var addition = {}
    addition[peer.id] = action
    self.addAuthoritativeAction(addition, tick)
  })
}

Engine.prototype.broadcastClientActionHistory = function(clientId){
  const self = this
  var history = self.stateMachine.getOptimisticActionHistory()
  var clientHistory = history.map(function(actionFrame){
    return actionFrame[clientId] || {}
  })
  var message = {
    type: 'clientActionHistory',
    data: {
      startTick: self.stateMachine.getFinalizedTick(),
      history: clientHistory,
    }
  }
  self.network.broadcast(message)
}

Engine.prototype.sendSnapshotToPeer = function(peer, tick) {
  const self = this
  if (tick === undefined) tick = self.stateMachine.getCurrentTick()
  self.stateMachine.getFinalizedState(function(err, state){
    if (err) return console.error(err.stack)
    var message = {
      type: 'snapshot',
      data: state,
    }
    self.sendMessageToPeer(peer, message)
  })
}

Engine.prototype.sendMessageToPeer = function(peer, message) {
  const self = this
  _debug('sendMessageToPeer:', peer.id, message)    
  var encoded = JSON.stringify(message)
  peer.reliable.write(encoded)
}

Engine.prototype.importSnapshot = function(snapshot) {
  const self = this
  _debug('import snapshot:', snapshot)
  self.stateMachine.putState(snapshot.tick, snapshot)
}

Engine.prototype.start = function(){
  const self = this
  var stateMachine = self.stateMachine

  _debug('-- start! --')

  setInterval(onTick, 1/TICK_RATE)
  setInterval(requestUpdateBroadcast, 1/BROADCAST_RATE)

  function onTick(cb){
    cb = cb || function(){}
    var tick = stateMachine.getCurrentTick()
    tick++
    stateMachine.putCurrentTick(tick)
    self.emit('tick', tick)
    // simulate as much as possible now
    _debug('onTick - before')
    stateMachine.getState(tick, function(err, state){
      _debug('onTick - after:', state)
      if (err) throw err
      cb()
    })
  }

  function requestUpdateBroadcast() {
    self.emit('broadcast')
  }
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
// Engine.prototype.importActionSetHistory = function(meta, message){
//   var actionHistory = message.actionHistory
// }

// Engine.prototype.importActionSetHistory = function(clientId, actionHistory){
//   const self = this
//   // _debug('actionHistory:', actionHistory)
//   actionHistory.actions.forEach(function eachAction(actionFrame, index){
//     if (!actionFrame) return null
//     var tick = actionHistory.startTick + index
//     var actionSet = actionFrame.clients[clientId]
//     self.importActionSet(clientId, actionSet, tick)
//   })
// }

// // imports an ActionSet from a peer, and adds it to the ActionFrame
// Engine.prototype.importActionSet = function(clientId, action, tick){
//   const self = this
  
//   // _debug('import - action:', action)

//   // validate actions
//   if (!action) return
//   // validate action is within sliding window
//   // _debug('import - action - tick:', tick, self.stateMachine.currentTick, self.stateMachine.tickInWindow(tick))
//   if (!self.stateMachine.tickInWindow(tick)) return
//   // TODO: validate entity ownership
  
//   // dedupe (dont apply action already received from user for frame)
//   var actionFrame = self.stateMachine.getActionFrame(tick)
//   // _debug('import - action - exist:', actionFrame.clients[clientId])
//   if (actionFrame.clients[clientId]) return

//   // update action frame
//   actionFrame.clients[clientId] = action
//   // _debug('import action:', actionFrame.clients[clientId])
//   self.stateMachine.setActionFrame(actionFrame, tick)
// }

// Engine.prototype.broadcastSnapshot = function(){
//   const self = this
//   var snapshot = {
//     state: self.stateMachine.getState(),
//     tick: self.stateMachine.currentTick,
//   }
//   self.network.broadcast({
//     type: 'stateSnapshot',
//     snapshot: snapshot,
//   })
//   // _debug('broadcast:', snapshot)
// }

// Engine.prototype.importSnapshot = function(meta, message){
//   const self = this
//   var state = message.snapshot.state
//   var tick = message.snapshot.tick
//   self.stateMachine.setState(state, tick)
//   _debug('import snapshot:', tick)
// }

function initialGameState(){
  return {
    players: {}
  }
}

function _debug(){
  var args = [].slice.call(arguments)
  args.unshift('Engine -')
  // console.log.apply(console, args)
}