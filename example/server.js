const Engine = require('../lib/engine.js')
const gameLogic = require('./logic.js')
const generateName = require('./names.js')

module.exports = Server

function Server(opts){
  const self = this

  var engine = self.engine = new Engine({
    networkType: 'server',
    stateTransitionFn: gameLogic,
  })

  engine.on('join', function(peer){
    var data = {}
    data[peer.id] = true
    var action = { join: data }
    self.addAction(action)
  })

  // // send state snapshot
  // engine.on('broadcast', engine.broadcastSnapshot.bind(engine))
  // // import actionHistories
  // // TODO: filter for only peer
  // engine.messages.on('actionHistory', engine.importActionHistory.bind(engine))

  // engine.start()

}

Server.prototype.addAction = function(action) {
  const self = this
  self.engine.addAuthoritativeAction('server', action)
}