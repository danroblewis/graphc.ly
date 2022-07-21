var express = require('express')
var sys = require("sys")
var util = require('util')
var socketio = require("socket.io")
var spawn = require('child_process').spawn;
//var Buffer = require('buffer').Buffer
var fs = require('fs')
var Compiler = require('./lib/compiler'); 
var jsondiffpatch = require('jsondiffpatch'); 
var http = require('http');

app = express()
server = http.createServer(app)

/*
app.configure(function(){
    app.use(express.methodOverride())
    app.use(express.bodyParser())
    app.use(app.router)
    app.use(express.static(__dirname + '/public'))
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
})
*/

app.use(express.static('public'))

var io = new socketio.Server(server)


var c_program = '#include <stdio.h>\n\nint main(void) {\n  printf("asdf\\n")\n  return 0;\n}\n'
c_program = fs.readFileSync('history/' + fs.readdirSync('history/').slice(-1)[0]).toString()
var syntax = 'python'
var stdout = ''
var stderr = ''
var last_c_program_saved = c_program
var unlock_timeout = null

var recompiling = false
var needs_recompile = false

var saves = {}

var users = {}

var compiler = new Compiler(c_program, syntax); 

function saveSavesToFile() {
  fs.writeFile("./saves.json", JSON.stringify(saves), function() {})
}
function readSavesFromFile() {
  fs.readFile("./saves.json", function(data){
    saves = JSON.parse(data)
  })
}

io.sockets.on('connection', function(client) {
  users[client.id] = null
  io.sockets.emit('users', Object.keys(users))

  client.emit('modify', c_program)
  client.emit( unlock_timeout ? 'lock' : 'unlock' )
  client.emit('syntax', syntax)
  client.emit('stdout', { timestamp: (new Date()).getTime(), text: stdout, error: stderr })
  compiler.recompile(c_program)

  client.on('syntax', function(message) {
    syntax = message
    client.broadcast.emit('syntax', syntax)
    compiler.syntax = syntax; 
    compiler.recompile(c_program); 
  })

  client.on('modify', function(message) {
    if (message == "") return
    if (unlock_timeout != null) clearTimeout(unlock_timeout)
    if (unlock_timeout == null) client.broadcast.emit('lock')
    unlock_timeout = setTimeout(function() {
      io.sockets.emit('unlock')
      unlock_timeout = null
    }, 5000)

    var current = {"program":c_program}; 
    var mod = {"program":message}; 

    var delta = jsondiffpatch.diff(current, mod);
    c_program = jsondiffpatch.patch(current, delta).program; 

    //client.broadcast.emit('modify', c_program)

    compiler.recompile(c_program)
  })

  client.on('saved', function(response) {
    console.log("#### Saving save:", response)
    saves[response.p] = response.k
    saveSavesToFile()
  })

  client.on('disconnect', function() {
    delete users[client.id]
    client.broadcast.emit('users', Object.keys(users))
  })
})


compiler.on('recompiled', function(a){
    io.sockets.emit('stdout', a); 
    io.sockets.emit('modify', c_program)
})

compiler.on('redrawn', function(a) {
    io.sockets.emit('redrawn', a)
})



setInterval(function() {
  if (c_program == last_c_program_saved) { return; }

  last_c_program_saved = c_program

  var d = new Date();
  var fname = "history/" + d.toJSON().replace(/[^0-9]/g,'')
  fs.writeFile(fname, c_program)
}, (1000*30)) //every 30 seconds 


server.listen(process.env.PORT || 3000, function() {
  console.log("listening on server port")
})

