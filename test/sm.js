const test = require('tape')
const StateMachine = require('../lib/sm.js')

test('StateMachine - getState, initial state', function(t){
  var stateMachine = StateMachine(addition)
  stateMachine.getState(0, function(err, state){
    t.ok(!err, 'did not error')
    t.deepEqual(state, {}, 'initial state is an empty obj')
    t.end()
  })
})


test('StateMachine - getState, putState', function(t){
  var stateMachine = StateMachine(addition)
  stateMachine.putState(0, { value: 10 })
  stateMachine.getState(0, function(err, state){
    t.ok(!err, 'did not error')
    t.deepEqual(state, { value: 10 }, 'state is as set first')
    stateMachine.putState(0, { value: 19 })
    stateMachine.getState(0, function(err, state){
      t.ok(!err, 'did not error')
      t.deepEqual(state, { value: 19 }, 'state is as set second')
      t.end()
    })
  })
})

test('StateMachine - run, actionFrames', function(t){
  var stateMachine = StateMachine(addition)
  stateMachine.putState(0, { value: 0 })
  stateMachine.putOptimisticAction(0, { value: 10 })
  stateMachine.getState(1, function(err, state){
    t.ok(!err, 'did not error')
    t.deepEqual(state, { value: 10 }, 'iterator state is as expected')
    stateMachine.putAuthoritativeAction(0, { value: 20 })
    stateMachine.getState(1, function(err, state){
      t.ok(!err, 'did not error')
      t.deepEqual(state, { value: 20 }, 'action override worked as expected')
      t.end()
    })
  })
})

// getState
// putState

// getOptimisticAction
// putOptimisticAction
// getAuthoritativeAction
// putAuthoritativeAction

// run

// util

function addition(input, action, cb){
  var a = input.value || 0
  var b = action.value || 0
  var result = { value: a+b }
  // console.log('iterate:', a, b, result)
  cb(null, result)
}
