const merge = require('merge').recursive
const async = require('async')
const SlidingWindow = require('./sliding-window.js')
const maxLengthForAddingActionSet = 8
const maxLengthForBroadcastActionHistory = 12
const maxLengthForStateCache = 16

module.exports = StateMachine

function StateMachine(stateTransFn) {
  if (!(maxLengthForBroadcastActionHistory>maxLengthForAddingActionSet)) throw new Error('StateMachine - broadcast must be longer than add-action window')
  if (!(maxLengthForStateCache>maxLengthForBroadcastActionHistory)) throw new Error('StateMachine - state cache must be longer than broadcast window')

  var highestTick = 0
  var cleanTick = 0
  var optimisticActionHistory = SlidingWindow(maxLengthForAddingActionSet)
  var authoritativeActionHistory = SlidingWindow(maxLengthForBroadcastActionHistory)
  var stateHistory = SlidingWindow(maxLengthForStateCache)

  return {
    run: run,
    getCurrentTick: getCurrentTick,
    getState: getState,
    putState: putState,
    getOptimisticAction: getOptimisticAction,
    putOptimisticAction: putOptimisticAction,
    getAuthoritativeAction: getAuthoritativeAction,
    putAuthoritativeAction: putAuthoritativeAction,
  }

  function getCurrentTick(){
    _debug('StateMachine - getCurrentTick')
    return highestTick
  }

  function getState(tick, cb) {
    _debug('StateMachine - getState')
    run(tick, function(err){
      if (err) return cb(err)
      var state = merge({}, stateHistory.get(tick))
      cb(null, state)
    })
  }

  function putState(tick, newState) {
    _debug('StateMachine - putState')
    stateHistory.put(tick, newState)
    cleanTick = tick
  }

  function getOptimisticAction(tick){
    _debug('StateMachine - getOptimisticAction')
    optimisticActionHistory.get(tick) || {}
  }

  function putOptimisticAction(tick, action){
    _debug('StateMachine - putOptimisticAction')
    optimisticActionHistory.put(tick, action)
    regressCleanTick(tick)
  }

  function getAuthoritativeAction(tick){
    _debug('StateMachine - getAuthoritativeAction')
    authoritativeActionHistory.get(tick) || {}
  }

  function putAuthoritativeAction(tick, action){
    _debug('StateMachine - putAuthoritativeAction')
    authoritativeActionHistory.put(tick, action)
    regressCleanTick(tick)
  }

  // iterate state from cleanTick to targetTick
  function run(targetTick, cb){
    _debug('StateMachine - run')
    
    async.whilst(isDirty, iterateState, cb)
    
    function isDirty(){
      return cleanTick<targetTick
    }
    
    function iterateState(cb){
      _debug('StateMachine - iterateState')
      var state = merge({}, stateHistory.get(cleanTick))
      var action = getMergedAction(cleanTick)
      stateTransFn(state, action, function saveStateResult(err, newState){
        if (err) return cb(err)
        cleanTick++
        stateHistory.put(cleanTick, newState)
        cb(null, newState)
      })
    }
    
  }

  // private

  function getMergedAction(tick) {
    _debug('StateMachine - getMergedAction')
    var optimistic = optimisticActionHistory.get(tick)
    var authoritative = authoritativeActionHistory.get(tick)
    var action = merge({}, optimistic, authoritative)
    return action
  }

  function regressCleanTick(targetTick){
    _debug('StateMachine - regressCleanTick')
    if (cleanTick<targetTick) return
    cleanTick = targetTick
  }

}

// util

function _debug(){
  console.log.apply(console, arguments)
}