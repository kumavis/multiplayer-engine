const clone = require('clone')

// interpolate
// soft error correction
// delay

module.exports = StateManager

function StateManager(stateTransitionFn, opts){
  const self = this
  opts = opts || {}
  self.currentTick = 0
  self._lastGoodTick = null
  self._stateHistory = {}
  self._actionHistory = {}
  self._historyLimit = opts.historyLimit || 10
  self._stateTransitionFn = stateTransitionFn
}

StateManager.prototype.nextTick = function(){
  const self = this
  // increment tick
  var previousTick = self.currentTick
  self.currentTick++
  var currentTick = self.currentTick
  // console.log('StateManager - nextTick() ->', currentTick)
  // clear old history
  delete self._stateHistory[currentTick-self._historyLimit]
  delete self._actionHistory[currentTick-self._historyLimit]
}

// set to an earlier tick
StateManager.prototype._setDirtyTick = function(newDirtyTick){
  const self = this
  var lastGoodTick = self._lastGoodTick
  var newGoodTick = newDirtyTick-1
  if (lastGoodTick === null || newGoodTick<lastGoodTick) {
    self._lastGoodTick = newGoodTick
  }
  // console.log('StateManager - _setDirtyTick(', newDirtyTick, ') ->', self._lastGoodTick)  
}

// set to a later tick
StateManager.prototype._setCleanTick = function(newTick){
  const self = this
  var lastGoodTick = self._lastGoodTick
  var currentTick = self.currentTick
  if (lastGoodTick===null || newTick>lastGoodTick) {
    self._lastGoodTick = newTick
  }
  // console.log('StateManager - _setCleanTick(', newTick, ') ->', self._lastGoodTick)
}

StateManager.prototype.isDirty = function(tick){
  const self = this
  if (tick === undefined) tick = self.currentTick
  var lastGoodTick = self._lastGoodTick
  var isDirty = lastGoodTick === null || lastGoodTick < tick
  // console.log('StateManager - isDirty(', tick, ') ->', isDirty)
  // console.log('var isDirty = lastGoodTick !== null && lastGoodTick < tick')
  // console.log('var isDirty = ',lastGoodTick !== null, '&&', lastGoodTick < tick)
  // console.log('var isDirty = ',lastGoodTick, '!== null', '&&', lastGoodTick, '<', tick)
  return isDirty
}

StateManager.prototype.tickInWindow = function(tick){
  const self = this
  var delta = (self.currentTick - tick)
  var inWindow = delta >= 0 && delta < self._historyLimit
  // console.log('StateManager - tickInWindow(', tick, ') ->', delta, inWindow)
  return inWindow
}

StateManager.prototype.getState = function(tick){
  // console.log('StateManager - getState(', tick)
  const self = this
  if (tick === undefined) tick = self.currentTick
  // lazy calculate state
  if (self.isDirty(tick)) {
    self.run(tick)
  }
  var state = self._stateHistory[tick]
  if (!state) throw new Error('StateManager - Empty state value')
  return state
}

StateManager.prototype.setState = function(newState, tick){
  const self = this
  if (tick === undefined) tick = self.currentTick
  // console.log('StateManager - setState(', newState, tick, ')')
  if (!newState) throw new Error('StateManager - setState - Empty state value')
  self._stateHistory[tick] = newState
  self._setCleanTick(tick)
}

StateManager.prototype.getActionFrame = function(tick){
  // console.log('StateManager - getActionFrame(', tick)
  const self = this
  if (tick === undefined) tick = self.currentTick
  var actionFrame = self._actionHistory[tick]
  if (!actionFrame) throw new Error('StateManager - getActionFrame - Empty action frame')
  return actionFrame
}

StateManager.prototype.setActionFrame = function(actionFrame, tick){
  const self = this
  if (tick === undefined) tick = self.currentTick
  // console.log('StateManager - setActionFrame(', actionFrame, tick, ')')

  if (!actionFrame) throw new Error('StateManager - setActionFrame - Empty action frame')
  self._actionHistory[tick] = actionFrame
  self._setDirtyTick(tick+1)
}

StateManager.prototype.run = function(tick){
  const self = this
  if (tick === undefined) tick = self.currentTick
  if (!self.isDirty(tick)) return

  var iteratorTick = self._lastGoodTick
  console.log('StateManager - run - playing from',iteratorTick,'to',tick)
  while (iteratorTick <= tick) {
    var iteratorState = self.getState(iteratorTick)
    var iteratorActionFrame = self.getActionFrame(iteratorTick)
    var newState = self._stateTransitionFn.call(null, iteratorState, iteratorActionFrame)
    // console.log('run:', iteratorTick, iteratorActionFrame, '->', iteratorState)
    self.setState(newState, iteratorTick+1)
    // set move pending tick forward
    self._setCleanTick(iteratorTick)
    // iterate
    iteratorTick++
  }
}
