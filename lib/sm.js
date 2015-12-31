const merge = require('merge').recursive
const async = require('async')
const semaphore = require('semaphore')
const SlidingWindow = require('./sliding-window.js')
const maxLengthForAddingActionSet = 8
const maxLengthForHistoryCache = 16

module.exports = StateMachine

function StateMachine(stateTransFn) {
  if (!(maxLengthForHistoryCache>maxLengthForAddingActionSet)) throw new Error('StateMachine - broadcast must be longer than add-action window')
  // if (!(maxLengthForHistoryCache>maxLengthForHistoryCache)) throw new Error('StateMachine - state cache must be longer than broadcast window')

  var lock = semaphore(1)
  var highestTick = 0
  var cleanTick = 0
  var optimisticActionHistory = SlidingWindow(maxLengthForAddingActionSet)
  var authoritativeActionHistory = SlidingWindow(maxLengthForHistoryCache)
  var stateHistory = SlidingWindow(maxLengthForHistoryCache)

  return {
    run: run,
    getCurrentTick: getCurrentTick,
    putCurrentTick: putCurrentTick,
    getState: getState,
    putState: putState,
    getFinalizedState: getFinalizedState,
    getOptimisticAction: getOptimisticAction,
    putOptimisticAction: putOptimisticAction,
    getAuthoritativeAction: getAuthoritativeAction,
    putAuthoritativeAction: putAuthoritativeAction,
  }

  function getCurrentTick(){
    _debug('getCurrentTick')
    return highestTick
  }

  function putCurrentTick(tick){
    _debug('putCurrentTick', tick)
    var delay = highestTick-cleanTick
    if (delay>maxLengthForHistoryCache) {
      throw new Error('StateMachine - this seems like it would break something')
    }
    highestTick = tick
  }

  function getState(tick, cb) {
    _debug('getState - before', tick)
    run(tick, function(err){
      if (err) return cb(err)
      var state = merge({}, stateHistory.get(tick))
      _debug('getState - after', state)
      cb(null, state)
    })
  }

  function putState(tick, newState) {
    _debug('putState')
    stateHistory.put(tick, newState)
    cleanTick = tick
    if (tick>highestTick) highestTick = tick
  }

  function getFinalizedState(cb) {
    _debug('getFinalizedState')
    var tick = highestTick - maxLengthForAddingActionSet
    if (tick<0) tick = 0
    getState(tick, cb)
  }

  function getOptimisticAction(tick){
    _debug('getOptimisticAction', tick)
    optimisticActionHistory.get(tick) || {}
  }

  function putOptimisticAction(tick, action){
    _debug('putOptimisticAction', tick, action)
    console.log('putOptimisticAction', tick, action)
    optimisticActionHistory.put(tick, action)
    regressCleanTick(tick)
  }

  function getAuthoritativeAction(tick){
    _debug('getAuthoritativeAction')
    authoritativeActionHistory.get(tick) || {}
  }

  function putAuthoritativeAction(tick, action){
    _debug('putAuthoritativeAction')
    authoritativeActionHistory.put(tick, action)
    regressCleanTick(tick)
  }

  // iterate state from cleanTick to targetTick
  function run(targetTick, cb){
    _debug('run - before')
    
    lock.take(function runLockFree(){
      async.whilst(isDirty, iterateState, onComplete)
    })
    
    function isDirty(){
      _debug('run - isDirty', cleanTick,'<', targetTick, cleanTick<targetTick)
      return cleanTick<targetTick
    }
    
    function iterateState(cb){
      _debug('run - iterateState')
      var state = merge({}, stateHistory.get(cleanTick))
      var action = getMergedAction(cleanTick)
      stateTransFn(state, action, function saveStateResult(err, newState){
        if (err) return cb(err)
        cleanTick++
        stateHistory.put(cleanTick, newState)
        cb(null, newState)
      })
    }

    function onComplete(err){
      _debug('run - end', cleanTick, targetTick, highestTick)
      lock.leave()
      cb(err)
    }
    
  }

  // private

  function getMergedAction(tick) {
    var optimistic = optimisticActionHistory.get(tick)
    var authoritative = authoritativeActionHistory.get(tick)
    var action = merge({}, optimistic, authoritative)
    // console.log('getMergedAction', tick)
    // console.log('op', JSON.stringify(optimistic))
    // console.log('auth', JSON.stringify(authoritative))
    // console.log('merge', JSON.stringify(action))
    return action
  }

  function regressCleanTick(targetTick){
    _debug('regressCleanTick')
    if (cleanTick<targetTick) return
    cleanTick = targetTick
  }

}

// util

function _debug(){
  var args = [].slice.call(arguments)
  args.unshift('StateMachine -')
  // console.log.apply(console, args)
}