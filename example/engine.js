const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits
const extend = require('xtend')
const Network = require('../lib/network.js')
const StateManager = require('../lib/state-manager.js')
const applyActions = require('./actions.js')

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
  stateManager.setActionFrame(newActionFrame())

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

  self.network.on('message', function(peer, message){
    // console.log(peer.id+':', message)
    if (!message.type) return
    self.messages.emit(message.type, { clientId: peer.id }, message)
  })


  //
  // loop
  //

  setInterval(onTick, 33)
  setInterval(broadcastUpdate, 100)

  function onTick(){
    stateManager.nextTick()
    stateManager.setActionFrame(newActionFrame())
    // simulate as much as possible now
    stateManager.run()
    // debug
    var gameState = stateManager.getState()
    // console.log('step:', gameState)
    self.emit('tick')
  }

  function broadcastUpdate() {
    self.emit('broadcast')
  }

}

Engine.prototype.createActionSet = function(meta, actionSet){
  const self = this
  var tick = self.stateManager.currentTick
  self.importActionSet(meta, actionSet, tick)
}

Engine.prototype.broadcastActionHistory = function(){
  const self = this
  var actionHistory = {
    startTick: self.stateManager.currentTick,
    actions: self.stateManager.getActionHistory(),
  }
  self.network.broadcast({
    type: 'actionHistory',
    actionHistory: actionHistory,
  })
  // console.log('broadcast:', actionHistory)
}

// imports an ActionHistory from a peer
Engine.prototype.importActionHistory = function(meta, message){
  const self = this
  var actionHistory = message.actionHistory
  console.log('actionHistory:', actionHistory)
  actionHistory.actions.forEach(function eachAction(actionFrame, index){
    if (!actionFrame) return null
    var tick = actionHistory.startTick + index
    var actionSet = actionFrame.clients[meta.clientId]
    console.log('actionFrame:', actionFrame)
    console.log('cliedId:', meta.clientId)
    console.log('actionSet:', actionSet)
    console.log('tick:', tick)
    self.importActionSet(meta, actionSet, tick)
  })
}

// imports an ActionSet from a peer, and adds it to the ActionFrame
Engine.prototype.importActionSet = function(meta, action, tick){
  const self = this
  
  console.log('import - action:', action)

  // validate actions
  if (!action) return
  var clientId = meta.clientId
  // validate action is within sliding window
  console.log('import - action - tick:', tick, self.stateManager.currentTick, self.stateManager.tickInWindow(tick))
  if (!self.stateManager.tickInWindow(tick)) return
  // TODO: validate entity ownership
  
  // dedupe (dont apply action already received from user for frame)
  var actionFrame = self.stateManager.getActionFrame(tick)
  console.log('import - action - exist:', actionFrame.clients[clientId])
  if (actionFrame.clients[clientId]) return

  // update action frame
  actionFrame.clients[clientId] = action
  console.log('import action:', actionFrame.clients[clientId])
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
}

function newActionFrame() {
  return {
    clients: {}
  }
}

function initialGameState(){
  return {
    players: {}
  }
}