var DuplexStream = require('stream').Duplex
// var DuplexStream = require('readable-stream').Duplex
var util = require('util')

util.inherits(ExampleDuplex, DuplexStream)

function ExampleDuplex(rtcChannel) {
  DuplexStream.call(this)
}

ExampleDuplex.prototype._read = noop

ExampleDuplex.prototype._write = function(data) {
  const self = this
  var string = data.toString()
  setTimeout(function(){
    self.push(transform(string))
  }, 200)
}

function transform(input){
  return "zzz_"+input
}

// util

function noop() {}

function ab2Buffer(ab) {
  var buffer = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
      buffer[i] = view[i];
  }
  return buffer;
}

// test


var duplex = new ExampleDuplex()

duplex.on('data', function(data){ console.log('debug: '+data) })

process.stdin.pipe(duplex).pipe(process.stdout)





