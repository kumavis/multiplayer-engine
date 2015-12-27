const extend = require('xtend')


module.exports = applyActions

function applyActions(state, actions) {
  var newState = extend(state)
  
  if(actions.moveX) {
    newState.x += actions.moveX*newState.speed
  }
  if(actions.moveY) {
    newState.y += actions.moveY*newState.speed
  }

  return newState
}