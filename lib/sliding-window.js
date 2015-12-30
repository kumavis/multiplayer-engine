const Cyclist = require('cyclist')

module.exports = SlidingWindow


function SlidingWindow(length){
  var cycle = Cyclist(length)
  var highestIndex = 0
  
  return {
    get: get,
    put: put,
  }

  function get(index){
    var tooHigh = index > highestIndex
    var tooLow = index < highestIndex-(length-1)
    if (tooHigh || tooLow) {
      // throw new Error('SlidingWindow - out of range')
      return undefined
    }
    return cycle.get(index)
  }

  function put(index, item){
    var tooHigh = index > highestIndex
    var tooLow = index < highestIndex-(length-1)
    if (tooHigh) {
      highestIndex = index
    } else if (tooLow) {
      // throw new Error('SlidingWindow - put - out of range')
      return
    }
    cycle.put(index, item)
  }

}