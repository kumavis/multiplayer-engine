var GameShell = require('game-shell')
const Network = require('./network.js')

new Client()

function Client(){

  var shell = GameShell()
  var network = new Network()
  var context

  var gameState = {
    players: {},
  }

  //Bind keyboard commands
  shell.bind('move-left', 'left', 'A')
  shell.bind('move-right', 'right', 'D')
  shell.bind('move-up', 'up', 'W')
  shell.bind('move-down', 'down', 'S')

  //Fired when document is loaded
  shell.on('init', function() {
    var canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 500
    shell.element.appendChild(canvas)
    context = canvas.getContext('2d')
  })

  //Fired once per game tick
  shell.on('tick', function(){
    var actions = getActions()
    // applyActions(actions)
    network.broadcast(actions)
  })

  network.on('join', function(peer){
    console.log('connected to '+peer.id)
  })

  network.on('message', function(peer, message){
    // console.log(peer.id+':', message)
    // TODO: filter for server
    // flat gamestate update from server
    gameState = message
  })

  function getActions(){
    var actions = {}
    
    if(shell.wasDown('move-left')) {
      actions.moveX = -1
    }
    if(shell.wasDown('move-right')) {
      actions.moveX = +1
    }
    if(shell.wasDown('move-up')) {
      actions.moveY = -1
    }
    if(shell.wasDown('move-down')) {
      actions.moveY = +1
    }

    return actions
  }

  //Render a frame
  shell.on('render', function(frame_time) {
    context.fillStyle = '#000'
    context.fillRect(0, 0, 500, 500)

    valuesFor(gameState.players).forEach(drawPlayer)
  })

  function drawPlayer(player){
    context.fillStyle = '#f00'
    context.fillRect(player.x-10, player.y-10, 20, 20)
  }

}


// util

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}