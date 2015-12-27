const extend = require('xtend')
const Network = require('./network.js')
const applyActions = require('./actions.js')
const StateManager = require('./state-manager.js')

module.exports = Server

function Server(opts){
  const self = this

  var network = new Network({
    isServer: true,
  })
  
  var stateManager = new StateManager(applyActions)
  stateManager.setState({ players: {} })
  stateManager.setActionFrame(newActionFrame())

  network.on('join', function(peer){
    console.log(peer.id+' joined.')
    importAction(peer.id, stateManager.currentTick, { action: 'joined' })
  })

  network.on('leave', function(peer){
    console.log(peer.id+' left.')
    importAction(peer.id, stateManager.currentTick, { action: 'left' })
  })

  network.on('message', function(peer, message){
    console.log(peer.id+':', message)
    var startTick = message.startTick
    importActions(peer.id, startTick, message.recentActions)
  })

  setInterval(broadcastWorld, 100)
  setInterval(onTick, 33)

  function importAction(peerId, tick, action){
    importActions(peerId, tick, [action])
  }

  function importActions(peerId, startTick, incommingActions){
    incommingActions.forEach(function importEachAction(action, index){
      // validate actions
      if (!action) return
      // validate action is within sliding window
      var tick = startTick+index
      if (!stateManager.tickInWindow(tick)) return
      
      // dedupe (dont apply action already received from user for frame)
      console.log('get action frame for tick', tick, '. in window?', stateManager.tickInWindow(tick))
      var actionFrame = stateManager.getActionFrame(tick)
      if (actionFrame.clients[peerId]) return

      // update action frame
      actionFrame.clients[peerId] = action
      stateManager.setActionFrame(actionFrame, tick)
    })
  }

  function onTick(){
    stateManager.nextTick()
    stateManager.setActionFrame(newActionFrame())
    // simulate as much as possible now
    stateManager.run()
  }

  function broadcastWorld(){
    // may trigger unperformed simulation
    var gameState = stateManager.getState()
    network.broadcast(gameState)
    console.log(gameState)
  }

}

function newActionFrame() {
  return {
    clients: {}
  }
}

function generatePlayer() {
  return {
    x: 250,
    y: 250,
    speed: 2,
  }
}

