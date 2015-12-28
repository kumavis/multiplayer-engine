const clone = require('clone')


module.exports = applyActions

function applyActions(state, actionFrame) {
  var newState = clone(state)
    
  console.log('apply frame:', actionFrame)
  for (var id in actionFrame.clients) {
    var action = actionFrame.clients[id]
    console.log('action:', id, action)
    
    if (action.join) {
      newState.players[id] = generatePlayer()
    }

    if (action.leave) {
      delete newState.players[id]
    }

    var playerState = newState.players[id]
    if (playerState) {
      if (action.moveX) {
        playerState.x += action.moveX * playerState.speed
      }
      if (action.moveY) {
        playerState.y += action.moveY * playerState.speed
      }
    }
  }
  
  return newState
}

// util

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}

function generatePlayer() {
  return {
    x: 250,
    y: 250,
    speed: 2,
  }
}

