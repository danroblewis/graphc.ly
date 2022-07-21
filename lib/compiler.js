var spawn = require('child_process').spawn;
var EventEmitter = require('node:events').EventEmitter;

var recompiling = false
var needs_recompile = false


exports = module.exports = Compiler; 

function Compiler(){
    this.c_program = arguments[0]; 
    this.syntax = arguments[1]; 
}

Compiler.prototype.__proto__ = EventEmitter.prototype; 

Compiler.prototype.recompile = function(){

  var self = this; 
  this.c_program = arguments[0]; 

  needs_recompile = true

  // Yo dawg you can't compile while you're compiling
  if (recompiling) return;

  recompiling = true

  var chunks = [],
      err_chunks = [],
      length = 0,
      err_length = 0

  var filename = '' + (new Date()).getTime() + Math.random()

  console.log('./bin/compile.sh ', filename, this.syntax)
  var gcc = spawn('./bin/compile.sh', [filename, this.syntax])

  gcc.stdout.on('data', function(data) {
      chunks.push(data)
      length += data.length
  })
  gcc.stderr.on('data', function(data) {
      err_chunks.push(data);
      err_length += data.length;
  })

  gcc.stdin.write(this.c_program)
  gcc.stdin.end()


  gcc.on('exit', function() {
      var buf = new Buffer(length),
          err_buf = new Buffer(err_length),
          i = 0
      
      chunks.forEach(function(b) {
          b.copy(buf, i, 0, b.length)
          i += b.length
      })

      i=0
      err_chunks.forEach(function(b) {
          b.copy(err_buf, i, 0, b.length)
          i += b.length
      })

      stdout = buf.toString()
      stderr = err_buf.toString()
      
      self.makeGraph(stdout, function() { self.emit.apply(self, arguments) }, function() {
        self.emit('recompiled', { timestamp: (new Date()).getTime(), text: stdout, error: stderr });
      })

      recompiling = false
      if (needs_recompile) {
          self.recompile(self.c_program)
          needs_recompile = false
      }
  })
}

Compiler.prototype.makeGraph = function (dotfile, emit, callback) {
  var chunks = [],
      length = 0
 
  var graphviz = spawn('dot', ['-Tpng'])//, '-Kfdp', '-n'])
  graphviz.stdout.on('data', function(data) {
      chunks.push(data)
      length += data.length
  })
  graphviz.stdin.write(dotfile)
  graphviz.stdin.end()
  graphviz.on('exit', function() {
      var buf = new Buffer(length),
          i = 0

      chunks.forEach(function(b) {
          b.copy(buf, i, 0, b.length)
          i += b.length
      })
     
      image = buf.toString('base64')
      emit('redrawn', { timestamp: (new Date()).getTime(), image: image });
      callback()
  })
}




