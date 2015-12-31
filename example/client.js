const GameShell = require('game-shell')
const Engine = require('../lib/engine.js')
const gameLogic = require('./logic.js')

new Client()
module.exports = Client

function Client(){
  const self = this

  var shell = GameShell()
  var renderContext
  self.playerId = null

  var engine = self.engine = new Engine({
    networkType: 'client',
    stateTransitionFn: gameLogic.run,
    initialState: gameLogic.initial(),
  })

  engine.on('ready', function(){
    self.playerId = engine.network._id
    addPlayer({ id: self.playerId })
    
    // // import stateSnapshots
    // engine.messages.on('stateSnapshot', engine.importSnapshot.bind(engine))
    // // send action histories
    // // TODO: filter for only self
    // engine.on('broadcast', engine.broadcastActionHistory.bind(engine))

    // start rendering
    shell.on('render', render)
    // capture user actions locally
    engine.on('tick', captureActions)

    engine.start()
  })

  function addPlayer(client) {
    // record client join as action
    var data = {}
    data[client.id] = true
    var action = { join: data }
    self.addActions('server', action)
  }

  //
  // Networking
  //


  //
  // Controls
  //

  //Bind keyboard commands
  shell.bind('move-left', 'left', 'A')
  shell.bind('move-right', 'right', 'D')
  shell.bind('move-up', 'up', 'W')
  shell.bind('move-down', 'down', 'S')

  function captureActions(){
    self.addActions(self.playerId, getActions())
  }

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
    renderContext = canvas.getContext('2d')
  })

  //Render a frame
  function render(deltaTime) {
    renderContext.fillStyle = '#000'
    renderContext.fillRect(0, 0, 500, 500)
    var tick = engine.stateMachine.getCurrentTick()
    engine.stateMachine.getState(tick, function(err, state){
      if (err) throw err
      valuesFor(state.players).forEach(drawPlayer)
    })
  }

  function drawPlayer(player){
    renderContext.fillStyle = '#f00'
    renderContext.fillRect(player.x-10, player.y-10, 20, 20)
  }

}

Client.prototype.addActions = function(peerId, actions) {
  const self = this
  var actionFrame = {}
  actionFrame[peerId] = actions
  _debug('captureActions:', JSON.stringify(actionFrame))
  self.engine.addOptimisticAction(actionFrame)
}
  

// util

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}

function _debug(){
  var args = [].slice.call(arguments)
  args.unshift('Client -')
  // console.log.apply(console, args)
}