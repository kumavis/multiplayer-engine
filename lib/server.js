const extend = require('xtend')
const Network = require('./network.js')
const applyActions = require('./actions.js')

module.exports = Server

function Server(opts){
  const self = this

  var network = new Network({
    isServer: true,
  })
  var gameState = {
    players: {},
  }

  network.on('join', function(peer){
    console.log(peer.id+' joined.')
    var player = generatePlayer()
    player.id = peer.id
    gameState.players[peer.id] = player
  })

  network.on('leave', function(peer){
    console.log(peer.id+' left.')
    delete gameState.players[peer.id]
  })

  network.on('message', function(peer, message){
    console.log(peer.id+':', message)
    var playerState = gameState.players[peer.id]
    var newState = applyActions(playerState, message)
    gameState.players[peer.id] = newState
  })

  setInterval(broadcastWorld, 100)

  function broadcastWorld(){
    network.broadcast(gameState)
    console.log(gameState)
  }

}



function generatePlayer() {
  return {
    x: 250,
    y: 250,
    speed: 2,
  }
}

