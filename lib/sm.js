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
    getState: getState,
    putState: putState,
    getOptimisticAction: getOptimisticAction,
    putOptimisticAction: putOptimisticAction,
    getAuthoritativeAction: getAuthoritativeAction,
    putAuthoritativeAction: putAuthoritativeAction,
  }

  function getState(tick, cb) {
    run(tick, function(err){
      if (err) return cb(err)
      var state = merge({}, stateHistory.get(tick))
      cb(null, state)
    })
  }

  function putState(tick, newState) {
    stateHistory.put(tick, newState)
    cleanTick = tick
  }

  function getOptimisticAction(tick){
    optimisticActionHistory.get(tick) || {}
  }

  function putOptimisticAction(tick, action){
    optimisticActionHistory.put(tick, action)
    regressCleanTick(tick)
  }

  function getAuthoritativeAction(tick){
    authoritativeActionHistory.get(tick) || {}
  }

  function putAuthoritativeAction(tick, action){
    authoritativeActionHistory.put(tick, action)
    regressCleanTick(tick)
  }

  // iterate state from cleanTick to targetTick
  function run(targetTick, cb){
    
    async.whilst(isDirty, iterateState, cb)
    
    function isDirty(){
      return cleanTick<targetTick
    }
    
    function iterateState(cb){
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
    var optimistic = optimisticActionHistory.get(tick)
    var authoritative = authoritativeActionHistory.get(tick)
    var action = merge({}, optimistic, authoritative)
    return action
  }

  function regressCleanTick(targetTick){
    if (cleanTick<targetTick) return
    cleanTick = targetTick
  }

}

// getState(0) -> s[0]
// getState(1) -> s[0]->a[0]->s[1]
