const GameShell = require('game-shell')
const Engine = require('../lib/engine.js')
const gameLogic = require('./logic.js')

new Client()
module.exports = Client

function Client(){
  const self = this

  var engine = new Engine({
    networkType: 'client',
    stateTransitionFn: gameLogic,
  })

  var playerId = null

  //
  // Networking
  //

  // // wait for first snapshot
  // engine.network.once('connected', function(selfId){
  //   engine.messages.once('stateSnapshot', readyToGo)
  //   playerId = selfId
  // })

  // function readyToGo(meta, message){
  //   engine.stateManager.currentTick = message.snapshot.tick
  //   engine.importSnapshot(meta, message)
  //   engine.importSnapshot(meta, message)
    
  //   // import stateSnapshots
  //   engine.messages.on('stateSnapshot', engine.importSnapshot.bind(engine))
  //   // send action histories
  //   // TODO: filter for only self
  //   engine.on('broadcast', engine.broadcastActionHistory.bind(engine))

  //   // start rendering
  //   shell.on('render', render)

  //   // capture user actions locally
  //   engine.on('tick', captureActions)

  //   engine.start()
  // }

  // //
  // // Controls
  // //

  // var shell = GameShell()
  // var context

  // //Bind keyboard commands
  // shell.bind('move-left', 'left', 'A')
  // shell.bind('move-right', 'right', 'D')
  // shell.bind('move-up', 'up', 'W')
  // shell.bind('move-down', 'down', 'S')

  // function captureActions(){
  //   var meta = { clientId: playerId }
  //   engine.createActionSet(meta, getActions())
  //   engine.stateManager.run()
  // }

  // function getActions(){
  //   var actions = {}
    
  //   if(shell.wasDown('move-left')) {
  //     actions.moveX = -1
  //   }
  //   if(shell.wasDown('move-right')) {
  //     actions.moveX = +1
  //   }
  //   if(shell.wasDown('move-up')) {
  //     actions.moveY = -1
  //   }
  //   if(shell.wasDown('move-down')) {
  //     actions.moveY = +1
  //   }

  //   return actions
  // }

  // //
  // // Render
  // //

  // //Fired when document is loaded
  // shell.on('init', function() {
  //   var canvas = document.createElement('canvas')
  //   canvas.width = 500
  //   canvas.height = 500
  //   shell.element.appendChild(canvas)
  //   context = canvas.getContext('2d')
  // })

  // //Render a frame
  // function render(deltaTime) {
  //   context.fillStyle = '#000'
  //   context.fillRect(0, 0, 500, 500)
  //   var gameState = engine.stateManager.getState()
  //   valuesFor(gameState.players).forEach(drawPlayer)
  // }

  // function drawPlayer(player){
  //   context.fillStyle = '#f00'
  //   context.fillRect(player.x-10, player.y-10, 20, 20)
  // }  

}


  

// util

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}