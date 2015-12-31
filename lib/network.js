// require('./webrtc-polyfill.js')
// Buffer = require('buffer/').Buffer
// var Peer = require('simple-peer')
const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits
const async = require('async')
const clone = require('xtend')
const Uuid = require('hat')
const quickconnect = require('rtc-quickconnect')
const RtcDataStream = require('rtc-data-stream')
const eos = require('end-of-stream')
const onData = require('./on-data.js')
const RELIABLE_OPTS = { label: 'relible', reliable: true, ordered: true }
const UNRELIABLE_OPTS = { label: 'unrelible', reliable: false, ordered: false, maxRetransmits: 0 }

//debug
Stdout = process.browser ? require('browser-stdout')() : process.stdout

module.exports = Network

inherits(Network, EventEmitter)

function Network(opts){
  const self = this
  EventEmitter.call(self)
  opts = opts || {}

  self._id = Uuid()
  self._type = opts.type
  self._peers = {}
  self._peerTypes = opts.peerTypes || ['client', 'server']

  // network message pubsub
  self.messages = new EventEmitter()

  self._initialize(opts)
}

// private

// peer
//   reliable
//   unreliable

// onNewConnection
//   emit own peer type
//   listen for peer type


Network.prototype._initialize = function(opts){
  const self = this

  quickconnect('https://switchboard.rtc.io/', { room: 'kumavis-game' })
  // .on('peer:couple', onInitialConnect)
  .createDataChannel('reliable')
  .createDataChannel('unreliable')
  .on('channel:opened:reliable', addConnection.bind(null, 'reliable'))
  .on('channel:opened:unreliable', addConnection.bind(null, 'unreliable'))

  // function onInitialConnect(id, peerConnection, data){
  //   establishDualConnection(peerConnection, handleHandshake)
  // }

  var connections = {}
  function addConnection(label, id, dataChannel){
    _debug('network - channel established:', label, id)
    var existing = connections[id] || {}
    existing[label] = dataChannel
    connections[id] = existing
    checkForBothConnections(id)
  }

  function checkForBothConnections(id){
    var existing = connections[id]
    if ('reliable' in existing && 'unreliable' in existing) {
      _debug('network - channels both established:', id)
      delete connections[id]
      var peer = createPeer({
        reliable: existing.reliable,
        unreliable: existing.unreliable,
      })
      handleHandshake(peer)
    }
  }

  function handleHandshake(peer) {
    // listen for handshake
    peer.reliable.once('data', function(handshake){
      _debug('network - got handshake:', handshake.toString())
      var data = handshake.toString().split(':')
      var peerType = data[0]
      var peerId = data[1]
      // if not known peerType, abort
      if (self._peerTypes.indexOf(peerType) === -1) {
        _debug('network - unknown peerType:', handshake.toString())
        return
      }
      // finalize connection
      peer.id = peerId
      peer.type = peerType
      self._onConnect(peer)
    })
    // send handshake
    var handshake = self._type+':'+self._id
    _debug('network - sending handshake:', handshake)
    peer.reliable.write(handshake)
  }

  function createPeer(opts){
    _debug('network - createPeer')
    var peer = new EventEmitter()
    peer.connection = opts.connection
    peer.reliable = RtcDataStream(opts.reliable)
    peer.unreliable = RtcDataStream(opts.unreliable)
    setupMessaging(peer, peer.reliable)
    setupMessaging(peer, peer.unreliable)
    return peer
  }

  function setupMessaging(peer, stream) {
    stream.on('data', function(data){
      var message = parseJson(data.toString())
      var type = message.type
      if (!type) return
      self.messages.emit(message.type, peer, message.data)
      self.messages.emit(peer.type+':'+message.type, peer, message.data)
    })
  }

}

Network.prototype._onConnect = function(peer) {
  const self = this
  self._peers[peer.id] = peer
  _debug('network - onConnect:', peer.id)
  // listen for disconnect
  eos(peer.reliable, self._onDisconnect.bind(self, peer))
  eos(peer.unreliable, self._onDisconnect.bind(self, peer))
  // emit connected peer
  self.emit('connect', peer)
  self.emit('connect:'+peer.type, peer)
}

Network.prototype._onDisconnect = function(peer) {
  const self = this
  if (!self._peers[peer.id]) return
  _debug('network - onDisconnect:', peer.id)
  delete self._peers[peer.id]
  self.emit('leave', peer)
  self.emit('leave:'+peer.type, peer)
}

Network.prototype.broadcast = function(message){
  const self = this
  // encode data
  var json = JSON.stringify(message)
  var data = new Buffer(json)
  // send to peers
  var peerList = valuesFor(self._peers)
  peerList.forEach(function sendToEachPeer(peer){
    peer.stream.write(data)
  })
}

// util

function _debug(){
  // console.log.apply(console, arguments)
}

function valuesFor(obj){
  return Object.keys(obj).map(function(key){ return obj[key] })
}

// wrtc util

// function onDataChannelReady(channel, cb) {
//   _debug('network - onDataChannelReady')
//   var channelMonitor;

//   function channelReady() {
//     _debug('network - channelReady')
//     // cleanup
//     clearInterval(channelMonitor);
//     channel.onopen = null;
//     // report
//     cb(null, channel)
//   }

//   // channel ready
//   if (channel.readyState === 'open') return channelReady()
//   // channel not ready
//   channel.onopen = channelReady;

//   // poll the channel open (don't trust the channel open event just yet)
//   channelMonitor = setInterval(function() {
//     if (channel.readyState === 'open') channelReady()
//   }, 500)
// }

// function establishDualConnection(peerConnection, cb){
//   _debug('network - establishDualConnection')
//   // theres a timing issue in chromium WRTC implementation
//   async.series([
//     function(cb){ establishDataChannel(peerConnection, RELIABLE_OPTS, cb) },
//     function(cb){ establishDataChannel(peerConnection, UNRELIABLE_OPTS, cb) },
//   ], function(err, results){
//     if (err) return console.error(err.stack)
//     var peer = createPeer({
//       connection: peerConnection,
//       reliable: results[0],
//       unreliable: results[1],
//     })
//     cb(peer)
//   })
// }

// function establishDataChannel(peerConnection, opts, cb){
//   _debug('network - establishDataChannel')
//   opts = clone(opts)
//   var label = opts.label
//   delete opts.label
//   var channel = peerConnection.createDataChannel(label)
//   onDataChannelReady(channel, cb)
// }



function parseJson(data){
  try {
    var message = JSON.parse(data)
    return message
  } catch(err) {
    return {}
  }
}