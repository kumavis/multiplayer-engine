const extend = require('xtend')
const Network = require('../lib/network.js')
const StateManager = require('../lib/state-manager.js')
const applyActions = require('./actions.js')
const Engine = require('./engine.js')

module.exports = Server

function Server(opts){
  const self = this

  var engine = new Engine({
    isServer: true,
  })

  // send state snapshot
  engine.on('broadcast', engine.broadcastSnapshot.bind(engine))
  // import actionHistories
  // TODO: filter for only peer
  engine.messages.on('actionHistory', engine.importActionHistory.bind(engine))

  engine.start()

}

function newActionFrame() {
  return {
    clients: {}
  }
}

