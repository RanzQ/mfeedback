
/**
 * Module dependencies.
 */
var express = require('express')
  , viewEngine = 'jade'
  , stylus = require('stylus')
  , nib = require('nib')
  , mongoStore = require('connect-mongo');

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
}

server._configure = function() {
  var app = this.express_server
    , db = this.db;
  
  // Configure server

  app.configure('development', function(){
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

  app.configure('production', function(){
    app.use(express.errorHandler()); 
  });

  app.configure(function(){
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

}

server._setupRoutes = function() {
    var app = this.express_server
      , db = this.db;

    // Set up routes

    /*
     * GET index page.
     */

    app.get('/', function(req, res){
      db.getCourses(function(error, courses) {
        if(error || !courses) {
          res.send(res_404, 404);
        } else { 
          res.render('index', {
            title: 'Mobile Feedback',
            courses: courses
          });
        }
      });
    });

    /*
     * GET course page.
     */

    app.get('/course/:id', function(req, res){
      var id = req.params.id.toLowerCase();
      db.getCourse(id, function(error, course) {
        if(error || !course) {
          res.send(res_404, 404);
        } else { 
          res.partial('course', {
            title: course.id.toUpperCase() + ' - ' + course.title 
          });
        }
      });
    });

    /*
    server.get('/c/:id([a-z0-9]{1,5})', function(req, res, next) {
        var id = req.params.id.toLowerCase();
        db.getLectureById(id, function(error, lecture) {
            if(error || !lecture) {
                res.send(res_404, 404);
            } else if (req.session.adminOf && req.session.adminOf[id] == true) {
                res.render('control.jade', { lecture: lecture });
            } else {
                res.render('pinform',  { lecture: lecture, method: 'post', errors: {pin: ''} });
            } 
        });
    });
    

   server.post('/c/:id([a-z0-9]{1,5})/pin', function(req, res) {
        var id = req.params.id.toLowerCase();
        db.getLectureById(id, function(error, lecture) {
            if(error || !lecture) {
                res.send(res_404, 404);
            } else if (lecture.pin === req.body.pincode) {
                if(!req.session.adminOf) { 
                    req.session.adminOf = { };
                }
                req.session.adminOf[id] = true;
                res.redirect('/c/' + id);
            } else {
                res.render('pinform',  {lecture: lecture, method: 'post', errors: {pin: 'Invalid pin'} });
            }
        });
    });


    server.get('/b/:id([a-z0-9]{1,5})', function(req, res, next) {
        var id = req.params.id.toLowerCase();
        db.getLectureById(id, function(error, lecture) {
            if(error || !lecture) {
                res.send(res_404, 404);
            } else { 
                res.render('bigscreen.jade', {
                    title: lecture.title, 
                });
            }
        });

    });


    server.get('/c/:lid([a-z0-9]+)/chat/:eid([0-9]+)', function(req, res) {
        var lid = req.params.lid.toLowerCase(); // lecture ID
        var eid = parseInt(req.params.eid, 10); // event ID
        var cid = lid + '_' + eid;              // channel ID
        //console.log(cid + ' REQUESTED');

        if (req.xhr) {
            db.getCappedBacklog(cid, function(error, messages) {
                if(error || !messages) {
                    console.log(error); 
                    res.send(res_404, 404); 
                    return;
                }
                //console.log(messages.length);
                
                res.partial('control_chat.jade', {lectureId: lid, eventId: eid, messages: messages});
                
            });
        } else {
            res.send(res_404, 404);
        }   
    });

    server.get('/c/:lid([a-z0-9]+)/poll/:eid([0-9]+)', function(req, res) {
        var lid = req.params.lid.toLowerCase(); // lecture ID
        var eid = parseInt(req.params.eid, 10); // event ID
        if (req.xhr) {
            db.getLectureEventById(lid, eid, function(error, event) {

                db.getPollById(event.pid, function(error, poll) {
                    if(error || !poll) {
                        console.log(error);
                        res.send(res_404, 404); 
                        return;
                    }
                    res.partial('control_poll.jade', {lectureId: lid, poll: poll, eventTitle: event.title});
                }); 
            });
        } else {
            res.send(res_404, 404);
        }          
    });

    server.get('/poll/:id([0-9]+)/results', function(req, res, next) {
        var id = req.params.id.toLowerCase();
        if (req.xhr) {
            //TODO: Fix me
            res.partial('pollresult.jade', {poll: []});
        } else {
            res.send('Nope.', 404);
        }          
    });

    server.get('/lecture/?', function(req, res) {
        db.getLectures(function(error, lectures) {
            res.render('lectures', {
                'lectures': lectures,
                'isCollapsed': 'true',
                'errors': {'pin': '', 'title': '', 'url': ''}, 
                'fields': {'pin': '', 'title': '', 'url': ''} 
            });
        });
    });

    server.post('/lecture/?', function(req, res) {
        //res.send(req.body);
        var url_regex = /^[a-z0-9]{1,5}$/
          , pin_regex = /^[0-9]{4}$/
          , title = req.body.title
          , url = req.body.url
          , pin = req.body.pin
          , response = res
          , request = req
          , res_data = {
                'lectures': {},
                'isCollapsed': 'false',
                'errors': {'pin': '', 'title': '', 'url': ''}, 
                'fields': {'pin': pin, 'title': title, 'url': url} 
            };


        if (pin.search(pin_regex) == -1) {
            res_data.errors.pin = 'Invalid pin (4 digits)';
        }
        if (url.search(url_regex) == -1) {
            res_data.errors.url = 'Invalid ID (max 5 characters, no special characters)';
        }
        if (!title || title.length > 64) {
            res_data.errors.title = 'Invalid title';
        }
        if (res_data.errors.pin || res_data.errors.url || res_data.errors.title) {
            response.render('lectures', res_data);
            return;
        }


        db.getLectureById(url, function(error, lecture) {
            if (error) {
                console.log(error);
                response.send(res_404, 404);
                return;
            }
            if (lecture) {
                res_data.errors.url = 'A lecture with that ID already exists, please choose another one';
                response.render('lectures', res_data);
                return;
            }

            var lecture = {
                owner: 'Unknown',           //username for the owner of this lecture
                title: title,               //title of the lecture
                lid: url,                   //lecture id
                pin: pin,                   //controller pin code
                state_c: 0,                 //state variables for the controller of this lecture
                state_s: 0,                 //state variables for the student view of this lecture
                state_b: 0,                 //state variables for the bigscreen view of this lecture
                events: []                  //list of all events (dicts) that belong to this lecture
            };
            db.addLecture(lecture, function(error, result) { 
                if (error) { 
                    console.log(error);
                    response.send(res_404, 404);
                    return;
                }
                response.redirect('/c/' + url);
            });
            
        });
    });

    server.get('/lecture/:id', function(req, res) {
        res.redirect('/lecture');
    });

    server.post('/lecture/:id', function(req, res) {
        res.redirect('/lecture');
    });

    server.del('/lecture/:id([a-z0-9]{1,5})', function(req, res) {
        var id = req.params.id.toLowerCase();
        console.log('Delete requested for lecture ' + id);
        db.getLectureById(id, function(error, lecture) {
            if(error || !lecture) {
                res.send(res_404, 404);
            } else if (req.session.adminOf && req.session.adminOf[id] == true) {
                console.log('Requesting user was authenticated, proceeding...');
                db.removeLecture(id, function(error) {
                    if (error) console.log(error);
                    res.contentType('application/json');
                    res.send({'redirect': '/lecture'});
                });             
            } else {
                res.contentType('application/json');
                res.send({'redirect': '/c/' + id});
            } 
        });
    });




    server.get('/:id([a-z0-9]{1,5})', function(req, res, next) {
        var id = req.params.id.toLowerCase();
        db.getLectureById(id, function(error, lecture) {
            if(error || !lecture) {
                res.send(res_404, 404);
            } else { 
                res.render('student.jade', {
                    title: lecture.title
                });
            }
        });
    });



    server.get('/', function(req, res){
      // Temporary redirect
      res.redirect('/lecture/');
    })




    server.on('connection', function(sock) {
      console.log('Client connected from ' + sock.remoteAddress);
      // Client address at time of connection ----^
    });
    */

}