
/**
 * Module dependencies.
 */

var express = require('express')
  , app = module.exports = express.createServer()
  , routes = require('./routes')
  , viewEngine = 'jade'
  , stylus = require('stylus')
  , nib = require('nib');


// Configure

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
  app.set('view options', { pretty: true });
  app.use(express.logger(':method :url :status'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());

  // Set up temporary memory store for sessions
  var MemStore = express.session.MemoryStore;
  sessionStore = new MemStore({ reapInterval: 60000 * 10 });
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


// Routes

app.get('/', routes.index);

app.listen(8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);




