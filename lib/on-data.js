module.exports = onData

function onData(stream, fn) {
  var _push = stream.push
  stream.push = function(data){
    fn(data)
    return _push.call(stream, data)
  }
}