
/**
 * Module dependencies.
 */
var express = require('express')
  , viewEngine = 'jade'
  , stylus = require('stylus')
  , nib = require('nib')
  , mongoStore = require('connect-mongo')
  , i18n = require("i18n")
  , dateFormat = require('dateformat');

require('jade/lib/inline-tags').push('textarea');

var exports = module.exports = Server;

var server = Server.prototype;

var res_404 = '<h1>404 - Not found</h1>';

function Server(db) {
  this.db = db;
  this.express_server = express.createServer();
  this._configure();
  this._setupRoutes();
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
      dest: __dirname + '/public/', // .styl resources are compiled `/stylesheets/*.css`
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
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));

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
     * GET organization page.
     */

    app.get('/:id', function(req, res) {
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

    app.get('/:orgid/:depid', function(req, res) {
      var orgId = req.params.orgid.toLowerCase();
      var depId = req.params.depid.toLowerCase();
      db.getOrganization(orgId, function(error, organization) {
        if (error || !organization) { res.send(res_404, 404); return; }  
        db.getDepartment(depId, function(error, department) {
          if (error || !department) { res.send(res_404, 404); return; } 
          db.getCoursesByDepartment(depId, function(error, courses) {
            if (error || !courses) {
              res.send(res_404, 404);
              return;
            }
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
      db.getCourse(id, function(error, course) {
        if (error || !course) { res.send(res_404, 404); return; }  
        var context = {
          title: course.id.toUpperCase() + ' - ' + course.title,
          id: course.id,
          lectures: course.lectures,
          assignments: course.assignments,
          exams: course.exams,
          dateFormat: dateFormat
        };
        if (req.xhr) {
          res.partial('partials/course_page', context);
        } else {
          res.render('course', context);
        }
      });
    });

    /*
     * GET lecture feedback page.
     */

    app.get('/course/:id/lecture/:number', function(req, res) {
      var id = req.params.id.toLowerCase()
        , number = req.params.number;

      db.getCourse(id, function(error, course) {
        if (error || !course) { res.send(res_404, 404); return; }
        var lecture = null;
        for (var i in course.lectures) {
          var l = course.lectures[i];
          if (number == l.number) lecture = l;
        }
        if (!lecture) { res.send(res_404, 404); return; } 
        var context = {
          title: course.id.toUpperCase() + ' - Lecture ' + lecture.number + ': ' + lecture.title,
          lecture: lecture
        };
        if (req.xhr) {
          res.partial('partials/lecture_feedback_page', context);
        } else {
          res.render('lecture_feedback', context);
        }
      });
    });

    /*
     * POST lecture feedback.
     */

    app.post('/course/:id/lecture/:number', function(req, res) {
      var courseId = req.params.id.toLowerCase()
        , number = req.params.number
        , feedback = req.body.message;

      db.addFeedback(courseId, 'lecture', number, feedback, function(error, result) {
        if (error || !req.xhr) { res.send(res_404, 404); return; }
        console.log(result);
        res.partial('partials/thank_you_page', {title: 'Thank you!'});
      });
    });


    /*
     * GET assignment feedback page.
     */

    app.get('/course/:id/assignment/:number', function(req, res) {
      var id = req.params.id.toLowerCase()
        , number = req.params.number.toLowerCase();

      db.getCourse(id, function(error, course) {
        if (error || !course) { res.send(res_404, 404); return; } 
        var assignment = null;
        for (var i in course.assignments) {
          var a = course.assignments[i];
          if (number == a.number) assignment = a;
        }
        if (!assignment) { res.send(res_404, 404); return; }  
        var context = {
          title: course.id.toUpperCase() + ' - Assignment ' + assignment.number,
          assignment: assignment
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

    app.post('/course/:id/assignment/:number', function(req, res) {
      var courseId = req.params.id.toLowerCase()
        , number = req.params.number
        , feedback = req.body.message;

      db.addFeedback(courseId, 'assignment', number, feedback, function(error, result) {
        if (error || !req.xhr) { res.send(res_404, 404); return; } 
        console.log(result);
        res.partial('partials/thank_you_page', {title: 'Thank you!'});
      });
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

      db.getCourse(id, function(error, course) {
        if (error || !course) { res.send(res_404, 404); return; } 
        var exam = null;
        for (var i in course.exams) {
          var e = course.exams[i];
          if (dateFormat(date, 'yyyymmdd') == dateFormat(e.date, 'yyyymmdd')) exam = e;
        }
        if (!exam) {
          res.send(res_404, 404);
        } 
        var context = {
          title: course.id.toUpperCase() + ' - Exam ' + dateFormat(exam.date, 'dd mmm yy'),
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
      var courseId = req.params.id.toLowerCase()
        , feedback = req.body.message
        , y = req.params.year 
        , m = req.params.month
        , d = req.params.day
        , date = new Date();

      date.setFullYear(y,m-1,d);
      date.setHours(0, 0, 0, 0);

      db.addFeedback(courseId, 'exam', date, feedback, function(error, result) {
        if (error || !req.xhr) {
          console.log(error);
          res.send(res_404, 404);
        } else  {
          console.log(result);
          res.partial('partials/thank_you_page', {title: 'Thank you!'});
        } 
      });
    });



};