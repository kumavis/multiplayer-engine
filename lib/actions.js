const clone = require('clone')


module.exports = applyActions

function applyActions(state, actions) {
  var newState = clone(state)

  valuesFor(actions).forEach(function(action){
    var playerState = newState.players[action.id]

    if(action.moveX) {
      playerState.x += action.moveX * playerState.speed
    }
    if(action.moveY) {
      playerState.y += action.moveY * playerState.speed
    }
  })
  
  return newState
}

// util

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}