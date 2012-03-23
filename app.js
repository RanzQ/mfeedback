/**
 * Module dependencies.
 */
var Server = require('./server')
  , DatabaseProvider = require('./db_provider');

var exports = module.exports;

var db = new DatabaseProvider('mfeedback');

// Uncomment following to add some dummydata
/*
var courses = [
  {'id':'t-76.1143', 'title':'Tiedonhallintajärjestelmät'},
  {'id':'t-76.3601', 'title':'Introduction to Software Engineering'},
  {'id':'t-76.4115', 'title':'Software Development Project I'},
  {'id':'t-76.4602', 'title':'Software Development Methods'},
  {'id':'t-76.5050', 'title':'Methods for Software Engineering and Business Research P'},
  {'id':'t-76.5115', 'title':'Software Development Project II'},
  {'id':'t-76.5150', 'title':'Software Architectures P'},
  {'id':'t-76.5158', 'title':'Ohjelmistotuotannon erikoistyö L'},
  {'id':'t-76.5612', 'title':'Software Project Management P'},
  {'id':'t-76.5613', 'title':'Software Testing and Quality Assurance P'},
  {'id':'t-76.5615', 'title':'Requirements Engineering P'},
  {'id':'t-76.5631', 'title':'Software processes P'},
  {'id':'t-76.5632', 'title':'Tietotekniikkaoikeus L'},
  {'id':'t-76.5633', 'title':'Ohjelmistotuotannon erikoiskurssi L'},
  {'id':'t-76.5650', 'title':'Seminar in Software Engineering P'},
  {'id':'t-76.5654', 'title':'Seminar on Software Product Development P'},
  {'id':'t-76.5655', 'title':'Ohjelmistotuotannon tutkimusseminaari L'},
  {'id':'t-76.5699', 'title':'Ohjelmistotuotannon yksilölliset opinnot L'},
  {'id':'t-76.5750', 'title':'Tietotekniikkaoikeuden seminaari L'},
  {'id':'t-76.5751', 'title':'Tietotekniikkaoikeuden erikoistyö L'},
  {'id':'t-76.5753', 'title':'Law in Network Society'},
  {'id':'t-76.5754', 'title':'Teknologiaoikeuden kirjatentti 1 L'},
  {'id':'t-76.5758', 'title':'Law and Technology - book examination 2 P'},
  {'id':'t-76.5759', 'title':'Tietotekniikkaoikeuden yksilölliset opinnot L'},
  {'id':'t-76.5762', 'title':'Legal Aspects of Service Management P'},
  {'id':'t-76.5764', 'title':'Faktat ja tietoyhteiskuntaviestintä'},
  {'id':'t-76.5900', 'title':'Software Engineering Learning Portfolio'},
  {'id':'t-76.7656', 'title':'Doctoral Seminar P'} ];

var testDate = new Date()
  , testDate2 = new Date()
  , testDate3 = new Date();

testDate.setFullYear(2012, 1, 1);
testDate.setHours(0, 0, 0, 0);
testDate2.setFullYear(2012, 2, 2);
testDate2.setHours(0, 0, 0, 0);
testDate3.setFullYear(2012, 3, 3);
testDate3.setHours(0, 0, 0, 0);



var testLectures = [
  {'number':'1', 'title':'First lecture', 'date':testDate},
  {'number':'2', 'title':'Second lecture', 'date':testDate2},
  {'number':'3', 'title':'Third lecture', 'date':testDate3} ];

var testAssignments = [
  {'number':'1', 'title':'First assignment', 'date':testDate},
  {'number':'2', 'title':'Second assignment', 'date':testDate2},
  {'number':'3', 'title':'Third assignment', 'date':testDate3} ];

var testExams = [
  {'date':testDate},
  {'date':testDate2},
  {'date':testDate3} ];


function saveCallback(err) {
  if (err) console.log(err);
}

for (var i = 0; i < courses.length; ++i) {

  var newCourse = new db.courses(courses[i]);

  for (var j = 0; j < testLectures.length; ++j) {
    newCourse.lectures.push(testLectures[j]);
    newCourse.assignments.push(testAssignments[j]);
    newCourse.exams.push(testExams[j]);
  }

  newCourse.save(saveCallback);

}*/


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