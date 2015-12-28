// require('./webrtc-polyfill.js')
// Buffer = require('buffer/').Buffer
// var Peer = require('simple-peer')
const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits
const quickconnect = require('rtc-quickconnect')
const RtcDataStream = require('rtc-data-stream')
const eos = require('end-of-stream')
const onData = require('./on-data.js')

//debug
Stdout = process.browser ? require('browser-stdout')() : process.stdout

module.exports = Network

inherits(Network, EventEmitter)

function Network(opts){
  const self = this
  EventEmitter.call(self)
  opts = opts || {}

  self._peers = []

  self._initialize(opts)
}

// public

Network.prototype.broadcast = function(message){
  const self = this
  var peerList = valuesFor(self._peers)
  if (!peerList.length) return
  var json = JSON.stringify(message)
  var data = new Buffer(json)
  // console.log('broadcasting:', data.toString())
  peerList.forEach(function sendToEachPeer(peer){
    // console.log('-"'+peer.id+'"')
    peer.stream.write(data)
  })
}

// private

Network.prototype._initialize = function(opts){
  const self = this
  
  // var peer = new Peer({ initiator: opts.isServer, trickle: false })
  // var peer = new Peer({ initiator: true, trickle: false })

  // peer.on('error', function (err) { console.log('error', err.stack) })

  // peer.on('signal', function (data) {
  //   console.log('SIGNAL', JSON.stringify(data))
  // })

  // if (!opts.isServer) {
  //   var signal = global.location.search.slice(1)
  //   console.log('FROM URL', signal)
  //   peer.signal(signal)
  // }

  // peer.on('connect', function () {
  //   console.log('CONNECT')
  //   peer.send('whatever' + Math.random())
  // })

  // peer.on('data', function (data) {
  //   console.log('data: ' + data)
  // })

  quickconnect('https://switchboard.rtc.io/', { room: 'kumavis-game' })
  .createDataChannel('primary')
  .on('channel:opened:primary', function(peerId, channel) {
    var stream = RtcDataStream(channel)
    // handshake
    stream.once('data', function(handshake){
      var data = handshake.toString().split(':')
      var greeting = data[0]
      if (opts.isServer && greeting !== 'client') return console.error('Network - Handshake fail...')
      if (!opts.isServer && greeting !== 'server') return console.error('Network - Handshake fail...')
      if (!opts.isServer) {
        var selfId = data[1]
        self.emit('connected', selfId)
      }
      // peer approved!
      var newPeer = {
        id: peerId,
        stream: stream,
      }
      self._onConnect(newPeer)
    })
    stream.write(opts.isServer ? 'server:'+peerId : 'client')
  })
}

Network.prototype._onConnect = function(peer) {
  const self = this
  // console.log('peer connected:', peer.id)
  self._peers[peer.id] = peer
  var stream = peer.stream
  stream.on('error', function(err){
    console.error(err.stack)
  })
  eos(stream, function lostConnection(){
    // try { throw new Error('StackTrace') } catch(err) { console.log(err.stack) }
    // console.log('peer disconnected:', peer.id)
    self._onDisconnect(peer)
  })
  stream.on('data', function(data){
    try {
      var message = JSON.parse(data.toString())
    } catch (err) {
      console.error(err)
    }
    self.emit('message', peer, message)
  })
  self.emit('join', peer)
}

Network.prototype._onDisconnect = function(peer) {
  const self = this
  delete self._peers[peer.id]
  self.emit('leave', peer)
}

// util

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}