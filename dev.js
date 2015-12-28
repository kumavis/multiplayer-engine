const Server = require('./example/server.js')
const wzrd = require('wzrd')
const PORT = 9000

// serve client app
wzrd.http({
  entries: [{ from: './example/client.js', to: 'app.js' }]
}).listen(PORT, ready)

// start server
function ready(err) {
  if (err) {
    console.error('error starting server', err)
    process.exit(1)
  }
  
  console.error('server started at http://localhost:' + PORT)
  var server = new Server()
}