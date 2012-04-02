/**
 * Module dependencies.
 */
var Server = require('./server')
  , DatabaseProvider = require('./db_provider');

var exports = module.exports;

var db = new DatabaseProvider('mfeedback');


// Initialize the express server
var server = new Server(db);
// Server port
var port = 8080;
var arg2 = process.argv[2];
if(typeof arg2 === 'string') {
  arg2 = parseInt(arg2, 10);
  if (typeof arg2 === 'number') { 
    port = arg2;
  }
}


try {
  server.listen(port);
} catch (error) {
  console.log('Unable to listen to port ' + port + '\nError returned was:\n\n' + error + '\n\nExiting...');
  process.exit(1);
}
console.log('Listening to port ' + port);
exports.server = server;


// Setup node process handling.
//logger.info('node process started', {pid: process.pid, argv: process.argv});
process.title = 'node mfeedback'; // Shown on ps -Af | grep node
process.on('SIGINT', function() {
  // Ctrl+C pressed. Could listen for a confirming keypress to really exit.
  gracefulShutdown('SIGINT');
}).on('SIGTERM', function() {
  // Kill command issued. Could be used to zero-downtime restart the process.
  // (or use SIGUSR2).
  gracefulShutdown('SIGTERM');
}).on('exit', function(code) {
  // Called eventually on process.exit().
  //logger.info('process exit', {code: code});
  console.log('\nShutting down. Replace me with a proper logger!\n');
}).on('uncaughtException', function(err) {
  if (err && err.stack) {
    //logger.error('uncaughtException', {stack: err.stack});
  } else {
    //logger.error('uncaughtException', {error: err});
  }
  // Assess the severity and restart if needed.
  //gracefulShutdown();
});

var shuttingdown = false;
function gracefulShutdown(reason) {
  //logger.info('initiated graceful shutdown...', {reason: reason});
  // Ensure there is only one graceful shutdown running.
  if (shuttingdown) return;
  shuttingdown = true;
  // Do your cleanup here, perhaps emit events to modules and listen
  // for acks (use require('async') if needed). Or distribute this logic.

  db.close();
  // Could set a timeout to error with process.exit(1).
  setTimeout(function() {
    process.exit(1);
  }, 100);
}