const clone = require('clone')


module.exports = {
  initial: initialState,
  run: iterateGameState,
}


function initialState() {
  return {
    players: {}
  }
}

function iterateGameState(state, actionFrame, cb) {
  var newState = clone(state)

  // _debug('peers:', Object.keys(actionFrame))
  for (var id in actionFrame) {
    if (id === 'server') {
      // server
      handleServerActions(newState, actionFrame, actionFrame.server)
    } else {
      // clients
      var clientActions = actionFrame[id]
      handleClientActions(newState, actionFrame, newState.players[id], clientActions)  
    }
  }
    
  // _debug('oldState:', state)
  // _debug('actionFrame:', actionFrame)
  // _debug('newState:', newState)
  cb(null, newState)

}

function handleServerActions(newState, actionFrame, serverActions){
  _debug('serverActions:', serverActions)
  // join
  for (var id in serverActions.join) {
    var newClient = serverActions.join[id]
    newState.players[id] = generatePlayer()
  }

  // leave
  for (var id in serverActions.leave) {
    delete serverActions.join[id]
  }

}

function handleClientActions(newState, actionFrame, clientState, clientActions){
  _debug('clientActions:', clientActions)

  if (clientActions.moveX) {
    clientState.x += clientActions.moveX * clientState.speed
  }
  if (clientActions.moveY) {
    clientState.y += clientActions.moveY * clientState.speed
  }

  _debug('clientState:', clientState)
}

// util

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}

function generatePlayer() {
  return {
    x: 250,
    y: 250,
    speed: 20,
  }
}

function _debug(){
  var args = [].slice.call(arguments)
  args.unshift('GameLogic -')
  console.log.apply(console, args)
}
