const extend = require('xtend')
const inherits = require('util').inherits
const Network = require('../lib/network.js')
const StateManager = require('../lib/state-manager.js')
const applyActions = require('./actions.js')
const Engine = require('./engine.js')

module.exports = Server

inherits(Server, Engine)

function Server(opts){
  const self = this

  Engine.call(self, {
    isServer: true,
  })

  engine = self
  // send state snapshot
  engine.on('broadcast', engine.broadcastSnapshot.bind(engine))
  // import actionHistories
  // TODO: filter for only peer
  engine.messages.on('actionHistory', engine.importActionHistory.bind(engine))

}

Server.prototype.broadcastState = 

function newActionFrame() {
  return {
    clients: {}
  }
}

