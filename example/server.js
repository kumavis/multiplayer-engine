const Engine = require('../lib/engine.js')
const gameLogic = require('./logic.js')
const generateName = require('./names.js')

module.exports = Server

function Server(opts){
  const self = this

  var engine = self.engine = new Engine({
    networkType: 'server',
    stateTransitionFn: gameLogic.run,
    initialState: gameLogic.initial(),
  })

  // engine.once('join', function(){
    engine.start()
  // }

  engine.on('join', function(client){
    // record client join as action
    var data = {}
    data[client.id] = true
    var action = { join: data }
    self.addActions(action)
    // send snapshot
    engine.sendSnapshotToPeer(client)
  })

  // // send state snapshot
  // engine.on('broadcast', engine.broadcastSnapshot.bind(engine))
  // // import actionHistories
  // // TODO: filter for only peer
  // engine.messages.on('actionHistory', engine.importActionHistory.bind(engine))

  // engine.start()

}

Server.prototype.addActions = function(actions) {
  const self = this
  var actionFrame = {}
  actionFrame['server'] = actions
  self.engine.addOptimisticAction(actionFrame)
}