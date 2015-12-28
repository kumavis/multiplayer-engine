const GameShell = require('game-shell')
const Network = require('../lib/network.js')
const applyActions = require('./actions.js')
const inherits = require('util').inherits
const Engine = require('./engine.js')

new Client()
module.exports = Client


inherits(Client, Engine)

function Client(){
  const self = this

  var engine = new Engine({
    isServer: false,
  })

  var playerId = null
  var isStarted = false

  //
  // Networking
  //

  // send action histories
  // TODO: filter for only self
  engine.on('broadcast', engine.broadcastActionHistory.bind(engine))
  // import stateSnapshots
  engine.messages.on('stateSnapshot', engine.importSnapshot.bind(engine))


  // TODO: move to engine
  engine.network.on('connected', function(selfId){
    console.log('connection established.')
    console.log('---start---')
    playerId = selfId
    isStarted = true
  })

  //
  // Controls
  //

  var shell = GameShell()
  var context

  //Bind keyboard commands
  shell.bind('move-left', 'left', 'A')
  shell.bind('move-right', 'right', 'D')
  shell.bind('move-up', 'up', 'W')
  shell.bind('move-down', 'down', 'S')

  engine.on('tick', function captureActions(){
    if (!isStarted) return

    var meta = { clientId: playerId }
    engine.createActionSet(meta, getActions())
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

  //
  // Render
  //

  //Fired when document is loaded
  shell.on('init', function() {
    var canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 500
    shell.element.appendChild(canvas)
    context = canvas.getContext('2d')
  })

  //Render a frame
  shell.on('render', function(frame_time) {
    if (!isStarted) return
    context.fillStyle = '#000'
    context.fillRect(0, 0, 500, 500)
    var gameState = engine.stateManager.getState()
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