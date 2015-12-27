const clone = require('clone')

// interpolate
// soft error correction
// delay

module.exports = State

function State(opts){
  const self = this
  self.currentTick = 0
  self._stateHistory = {}
  self._actionHistory = {}
  self._historyLimit = 10
  self._pendingRewind = null
  self._pendingActions = []
}

State.prototype.nextTick = function(){
  const self = this
  var oldState = self.getState()
  self.currentTick++
  var currentTick = self.currentTick
  // this tick has not beed processed yet
  self._pendingRewind = currentTick
  self._stateHistory.length = currentTick
  // optomistic? maybe dont need to clone?
  self._stateHistory[currentTick] = clone(oldState)
  // console.log('nextTick!', currentTick, oldState, self._stateHistory)
  // clean
  delete self._stateHistory[currentTick-self._historyLimit]
  delete self._actionHistory[currentTick-self._historyLimit]
}

State.prototype.getState = function(tick){
  const self = this
  if (tick === undefined) tick = self.currentTick
  // console.log('getState!', tick, self._stateHistory)
  return self._stateHistory[tick] || {}
}

State.prototype.setState = function(state, tick){
  const self = this
  if (tick === undefined) tick = self.currentTick
  // console.log('setState!', state)
  self._stateHistory[tick] = state
}

State.prototype.getActionFrame = function(tick){
  const self = this
  if (tick === undefined) tick = self.currentTick
  // console.log('getState!', tick, self._stateHistory)
  return self._actionHistory[tick] || {}
}

State.prototype.putActionFrame = function(actionFrame, tick){
  const self = this
  if (tick === undefined) tick = self.currentTick
  // console.log('getState!', tick, self._stateHistory)
  self._actionHistory[tick] = actionFrame
  self._pendingRewind = tick
}

State.prototype.putAction = function(action, tick){
  throw new Error('StateManager - putAction is deprecated')
  // const self = this
  // if (tick === undefined) tick = self.currentTick
  // // CHECK if this will trigger a change
  // var frame = self._actionHistory[tick] || (self._actionHistory[tick] = {})
  // // abort if action already present
  // if (frame[action.id]) return
  // // store action
  // frame[action.id] = action
  // // trigger an update/dirty
  // var currentRewind = self._pendingRewind
  // if (currentRewind === null || currentRewind < tick) return
  // self._pendingRewind = tick
}

State.prototype.replayPending = function(fn){
  const self = this
  var endTick = self.currentTick
  var rewindStart = self._pendingRewind
  if (rewindStart === null) return
  // iterate over pending frames
  var currentTick = self.currentTick = rewindStart
  while (currentTick <= endTick) {
    var currentState = self.getState()
    var actions = self._actionHistory[currentTick] || {}
    fn(currentState, actions)
    self.currentTick++
    currentTick = self.currentTick
  }
  // clean up
  self._pendingRewind = null
}