
/**
 * Module dependencies.
 */
var express = require('express')
  , viewEngine = 'jade'
  , stylus = require('stylus')
  , nib = require('nib')
  , mongoStore = require('connect-mongo')
  , mongooseAuth = require('mongoose-auth')
  , i18n = require("i18n")
  , dateFormat = require('dateformat');

// Fix white-space problem with textareas
require('jade/lib/inline-tags').push('textarea');

var exports = module.exports = Server;

var server = Server.prototype;

var res_404 = '<h1>404 - Not found</h1>';

function Server(db, options) {
  this.db = db;
  if (options) {
    this.express_server = express.createServer(options);
  } else {
    this.express_server = express.createServer();
  }
  this._configure();
  this._setupRoutes();
  mongooseAuth.helpExpress(this.express_server);
}

server.listen = function(port) {
  this.express_server.listen(port);
};

server._configure = function() {
  var app = this.express_server
    , db = this.db;
  
  // Configure server

  app.configure('development', function() {
    var stylusMiddleware = stylus.middleware({
      src: __dirname + '/stylus/', // .styl files are located in `/stylus`, must match /public folder structure
      dest: __dirname, // .styl resources are compiled `public/stylesheets/*.css`
      debug: true,
      compile: function(str, path) { // optional, but recommended
        return stylus(str)
          .set('filename', path)
          .set('warn', true)
          .set('compress', true)
          .use(nib());
        }
    });
    app.use(stylusMiddleware);  
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  });

  app.configure('production', function() {
    app.use(express.errorHandler()); 
  });

  app.configure(function() {
    app.set('views', __dirname + '/views/');
    app.set('view engine', viewEngine);
    app.set('view options', { pretty: true, layout: false });
    app.use(express.logger(':method :url :status'));
    app.use(express.bodyParser());
    app.use(express.cookieParser());

    //var MemStore = express.session.MemoryStore;
    //sessionStore = new MemStore({ reapInterval: 60000 * 10 });
    sessionStore = new mongoStore({ db: db.getDatabaseName() });
    app.use(express.session({secret: "O09zC8#KgUZFyBad", store: sessionStore, key: "mfb"}));
    app.use(express.methodOverride());
    //app.use(app.router); // Disabled for mongooseAuth
    app.use('/public', express['static'](__dirname + '/public'));
    app.use(mongooseAuth.middleware());

    app.dynamicHelpers({
      isDevMode: function (req, res) {
        return (process.env.NODE_ENV || 'development') === 'development';
      }
    });
  });
};

server._setupRoutes = function() {
    var app = this.express_server
      , db = this.db;


    function checkSession(req, res, voteId) {
      var session = req.session;
      if (!session) {
        res.contentType('json');
        res.send({'msg': 'Something went terribly wrong. Try refreshing the page.'});
        return false; 
      }
      // Check if there's already an object for cast votes and create it if needed
      if (!session.votesCast) {
          console.log('Creating a new session');
          session.votesCast = { };
      }

      var votesCast = session.votesCast;

      // If the vote ID was in the already cast votes object, 
      // refuse to register the vote and return
      if (votesCast[voteId]) {
          res.contentType('json');
          res.send({
            'msg': 'You have already voted'
          });
          return false;
      }
      return true;
    }

    function addFeedback(req, res, eventType, date) {
      var courseId = req.params.id.toLowerCase()
        , feedback = req.body.message
        , votetype = req.body.votetype
        , feedbackId = req.body.feedbackid
        , fb = {'body': feedback, 'votetype': votetype, 'feedbackid': feedbackId}
        , isVote = (votetype !== undefined)
        , isReply = (feedbackId !== undefined && !isVote)
        , voteId = null;

      if (feedbackId) {
        voteId = feedbackId;
      } else {
        voteId = courseId + eventType.substring(0,1) + date;
      }

      
      // If this is a vote, check that the session is valid
      // If the session is not valid, return
      //if (isVote && !checkSession(req, res, voteId)) {
      //    return;
      //}

      db.addFeedback(courseId, eventType, date, fb, function(error, result) {
        if (error || !req.xhr) { res.send(res_404, 404); return; }
          // If feedback is undefined, this is either an upvote or downvote
          // so we should respond with json

          if (isVote) {
            // Save the voteId to session so user can't vote again during
            // this session
            var session = req.session;
            session.votesCast[voteId] = true;
            session.save();
            res.contentType('json');
            res.send({
              'msg': 'Thank you for your vote!', 
              'votes': result.votes
              //'feedbackId': feedbackId
            });
          } else if (eventType === 'course') {
            res.partial('partials/thank_you_page', {
              title: 'Thank you!',
              back_url: '/course/' + courseId
            });
          } else {
            var context = {
              title: courseId.toUpperCase() + ' - Lecture ' + dateFormat(result.date, 'dd mmm yy'),
              lecture: result,
              dateFormat: dateFormat
            };
            res.partial('partials/lecture_feedback_page', context);
          }
      });
    }

    /*
     * GET index page.
     */

    app.get('/', function(req, res) {
      db.getOrganizations(function(error, organizations) {
        if (error || !organizations) { res.send(res_404, 404); return; } 
        var context = {
          title: 'Mobile Feedback',
          organizations: organizations
        };
        if (req.xhr) {
          res.partial('partials/index_page', context);
        } else {
          res.render('index', context);
        }
      });
    });

    /*
     * Logout.
     */

    app.get('/logout', function (req, res) {
      req.logout();
      res.redirect('/');
    });

    /*
     * Redirect for favicon.
     */

    app.get('/favicon.ico', function (req, res) {
      res.redirect('/public/favicon.ico');
    });

    /*
     * GET organization page.
     */

    app.get('/courses/:id', function(req, res) {
      var id = req.params.id.toLowerCase();
      db.getOrganization(id, function(error, organization) {
        if (error || !organization) { res.send(res_404, 404); return; }  
        db.getDepartmentsByOrganization(id, function(error, departments) {
          if (error || !departments) { res.send(res_404, 404); return; }  
          var context = {
            title: 'Mobile Feedback - ' + organization.title,
            orgId: organization.id,
            departments: departments
          };
          if (req.xhr) {
            res.partial('partials/organization_page', context);
          } else {
            res.render('organization', context);
          }
        });
      });
    });

    /*
     * GET department page.
     */

    app.get('/courses/:orgid/:depid', function(req, res) {
      var orgId = req.params.orgid.toLowerCase();
      var depId = req.params.depid.toLowerCase();
      db.getOrganization(orgId, function(error, organization) {
        if (error || !organization) { res.send(res_404, 404); return; }  
        db.getDepartment(depId, function(error, department) {
          if (error || !department) { res.send(res_404, 404); return; } 
          db.getCoursesByDepartment(depId, true, function(error, courses) {
            if (error || !courses) { res.send(res_404, 404); return; } 
            var context = {
              title: 'Mobile Feedback - ' + department.title,
              courses: courses
            };
            if (req.xhr) {
              res.partial('partials/department_page', context);
            } else {
              res.render('department', context);
            }
          });
        });
      });
    });

    /*
     * GET course page.
     */

    app.get('/course/:id', function(req, res) {
      var id = req.params.id.toLowerCase();
      var midnight = new Date()
        , twoWeeksAgo = new Date();
      midnight.setHours(23, 59, 59, 99);
      twoWeeksAgo.setHours(twoWeeksAgo.getHours() - 14*24, 59, 59);
      db.getCourse({'courseId': id, 'populateEvents': true, 
        'filters': {'date': {'$lt': midnight, '$gt': twoWeeksAgo}}},
        function(error, course) {
          if (error || !course) {res.send(res_404, 404); return;}
          var context = {
            title: course.id.toUpperCase() + ' - ' + course.title,
            course: course,
            dateFormat: dateFormat
          };
          if (req.xhr) {
            res.partial('partials/course_page', context);
          } else {
            res.render('course', context);
          }
      });
    });

    app.get('/course/:id/more', function(req, res) {
      var id = req.params.id.toLowerCase()
        , eventType = req.query.t
        , page = req.query.p
        , perPage = 10
        , twoWeeksAgo = new Date()
        , dateString = ''
        , target = ''
        , title = null;
      twoWeeksAgo.setHours(twoWeeksAgo.getHours() - 14*24, 59, 59);
      var filters = {'date': {'$lt': twoWeeksAgo}};

      

      if (eventType === 'lecture') {
        title = function(c) {
          return dateFormat(c.date, 'dd mmm yy') + ' ' + c.topic;
        };
        dateString = 'yyyymmdd';
        target = '.lecture-list';
      } else if (eventType === 'assignment') {
        title = function(c) {
          return c.title + ' (DL: ' + dateFormat(c.date, 'dd mmm yy') + ')';
        };
        dateString = 'yyyymmddHHMM';
        target = '.assignment-list';
      } else if (eventType === 'exam') {
        title = function(c) {
          return 'Exam: ' + dateFormat(c.date, 'dd mmm yy');
        };
        dateString = 'yyyymmdd';
        target = '.exam-list';
      } else {
        res.send({'error': 'What?'});
        return;
      }
      db.getPage({'courseId': id, 'page': page,
        'perPage': perPage, 'filters': filters,
        'collection': eventType + 's'},
        function(err, result) {
          var data = []
            , c = null
            , hasMore = 0
            , base_url = ['/course', id, eventType].join('/');

          if (result.length > perPage) {
            hasMore = 1;
          }

          for (i = 0, j = result.length - hasMore; i < j; i++) {
            c = result[i];
            fl = c.feedbacks ? c.feedbacks.length : 0;
            data.push({
              'full_url': [base_url, dateFormat(c.date, dateString)].join('/'),
              'title': title(c),
              'feedback_length': fl
            });
          }
          res.send({'res': data, 'hasMore': hasMore, 
            'target': target, 'nextPage': parseInt(page, 10) + 1});
      });
    });

    /*
     * GET course feedback page.
     */

    app.get('/course/:id/feedback', function(req, res) {
      var id = req.params.id.toLowerCase();
      db.getCourse({'courseId': id}, function(error, course) {
        if (error || !course) { res.send(res_404, 404); return; }  
        var context = {
          title: course.id.toUpperCase() + ' - ' + course.title,
          course: course,
          dateFormat: dateFormat
        };
        if (req.xhr) {
          res.partial('partials/course_feedback_page', context);
        } else {
          res.render('course_feedback', context);
        }
      });
    });

    /*
     * POST course feedback.
     */

    app.post('/course/:id/feedback', function(req, res) {
      addFeedback(req, res, 'courses', date);
    });

    /*
     * GET show feedback page.
     */

    app.get('/course/:id/show_feedback', function(req, res) {
      var id = req.params.id.toLowerCase();
      db.getCourse({'courseId': id, 'populateEvents': true}, function(error, course) {
        if (error || !course) { res.send(res_404, 404); return; }  
        var context = {
          title: course.id.toUpperCase() + ' - ' + course.title,
          course: course,
          dateFormat: dateFormat
        };
        if (req.xhr) {
          res.partial('partials/show_feedback_page', context);
        } else {
          res.render('show_feedback', context);
        }
      });
    });

    /*
     * GET lecture feedback page.
     */

    app.get('/course/:id/lecture/:year([0-9]{4}):month([0-9]{2}):day([0-9]{2})', function(req, res) {
      var id = req.params.id.toLowerCase()
        , y = req.params.year 
        , m = req.params.month
        , d = req.params.day
        , date = new Date();

      date.setFullYear(y,m-1,d);
      date.setHours(0, 0, 0, 0);

      db.getLecture({'courseId': id, 'date':date}, function(error, lecture) {
        if (error || !lecture) { res.send(res_404, 404); return; }
        var context = {
          title: id.toUpperCase() + ' - Lecture ' + dateFormat(lecture.date, 'dd mmm yy'),
          lecture: lecture,
          dateFormat: dateFormat
        };
        if (req.xhr) {
          res.partial('partials/lecture_feedback_page', context);
        } else {
          console.log(context);
          res.render('lecture_feedback', context);
        }
      });
    });

    /*
     * POST lecture feedback, vote, feedback reply or feedback vote.
     */

    app.post('/course/:id/lecture/:year([0-9]{4}):month([0-9]{2}):day([0-9]{2})', function(req, res) {
      var y = req.params.year 
        , m = req.params.month
        , d = req.params.day
        , date = new Date();

      date.setFullYear(y,m-1,d);
      date.setHours(0, 0, 0, 0);
      console.log(req.body);
      addFeedback(req, res, 'lectures', date);
    });

    /*
     * GET assignment feedback page.
     */

    app.get('/course/:id/assignment/:year([0-9]{4}):month([0-9]{2}):day([0-9]{2}):hour([0-9]{2}):minute([0-9]{2})', function(req, res) {
      var id = req.params.id.toLowerCase()
        , y = req.params.year 
        , m = req.params.month
        , d = req.params.day
        , h = req.params.hour
        , min = req.params.minute
        , date = new Date();

      date.setFullYear(y,m-1,d);
      date.setHours(h, min, 0, 0);

      db.getAssignment({'courseId': id, 'date': date}, function(error, assignment) {
        if (error || !assignment) { res.send(res_404, 404); return; } 

        var context = {
          title: id.toUpperCase() + ' - ' + assignment.title,
          assignment: assignment,
          dateFormat: dateFormat
        };
        if (req.xhr) {
          res.partial('partials/assignment_feedback_page', context);
        } else {
          res.render('assignment_feedback', context);
        }
      });
    });

    /*
     * POST assignment feedback.
     */

    app.post('/course/:id/assignment/:year([0-9]{4}):month([0-9]{2}):day([0-9]{2}):hour([0-9]{2}):minute([0-9]{2})', function(req, res) {
      var y = req.params.year 
        , m = req.params.month
        , d = req.params.day
        , h = req.params.hour
        , min = req.params.minute
        , date = new Date();

      date.setFullYear(y,m-1,d);
      date.setHours(h, min, 0, 0);

      addFeedback(req, res, 'assignments', date);
    });

    /*
     * GET exam feedback page.
     */

    app.get('/course/:id/exam/:year([0-9]{4}):month([0-9]{2}):day([0-9]{2})', function(req, res) {
      var id = req.params.id.toLowerCase()
        , y = req.params.year 
        , m = req.params.month
        , d = req.params.day
        , date = new Date();

      date.setFullYear(y,m-1,d);
      date.setHours(0, 0, 0, 0);

      db.getExam({'courseId': id, 'date': date}, function(error, exam) {
        if (error || !exam) { res.send(res_404, 404); return; } 

        var context = {
          title: id.toUpperCase() + ' - Exam ' + dateFormat(exam.date, 'dd mmm yy'),
          exam: exam,
          dateFormat: dateFormat
        };
        if (req.xhr) {
          res.partial('partials/exam_feedback_page', context);
        } else {
          res.render('exam_feedback', context);
        }
      });
    });

    /*
     * POST exam feedback.
     */

    app.post('/course/:id/exam/:year([0-9]{4}):month([0-9]{2}):day([0-9]{2})', function(req, res) {
      var y = req.params.year 
        , m = req.params.month
        , d = req.params.day
        , date = new Date();

      date.setFullYear(y,m-1,d);
      date.setHours(0, 0, 0, 0);

      addFeedback(req, res, 'exams', date);
    });


  /*
   * GET course search
   */

  app.get('/search', function(req, res) {
    var query = req.query
      , db_query = query;
    for (var i in query) {
      if (i !== 'q') {
        delete db_query[i];
      }
    }
    db.searchCourses(db_query, function(error, result) {
      if (error) console.log(error);
      context = {'title': 'Search results', 'results': result, 'search_term': db_query['q']};
      if (req.xhr) {
        res.partial('partials/search_results_page', context);
      } else {
        res.render('search_results', context);
      }
    });
  });
};
