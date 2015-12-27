const test = require('tape')
const StateManager = require('../lib/state-manager.js')

test('StateManager - isDirty', function(t){
  var stateManager = new StateManager(identity)
  stateManager.setState({})
  stateManager.setActionFrame({})
  t.ok(!stateManager.isDirty(), 'stateManager is not dirty')

  stateManager.nextTick()
  stateManager.setActionFrame({})
  t.ok(stateManager.isDirty(), 'stateManager is dirty')

  stateManager.run()
  t.ok(!stateManager.isDirty(), 'stateManager is not dirty')

  t.end()
})

test('StateManager - tickInWindow', function(t){
  var stateManager = new StateManager(identity)
  stateManager.setState({})
  stateManager.setActionFrame({})
  
  t.ok(stateManager.tickInWindow(0), 'tick 0 in window')
  t.ok(!stateManager.tickInWindow(-8000), 'tick -8000 not in window')
  
  t.end()
})

// util

function identity(input){ return input }


// notes

/*

* clear meaning to dirtyTick
* unite initial state and constructor ?
* unite nextTick and setActionFrame ?

*/