/*
 * This module includes route functions.
 */

exports = module.exports = Router;

var app = Router.prototype;

function Router(db) {
  this.db = db;
}

/*
 * GET index page.
 */

app.getIndex = function(req, res){
  console.log(this.db);
  this.db.getCourses(function(error, courses) {
    if(error || !courses) {
      res.send(res_404, 404);
    } else { 
      res.render('index', {
        title: 'Mobile Feedback',
        courses: 'courses'
      });
    }
  });
};

/*
 * GET course page.
 */

app.getCourse = function(req, res){
  var id = req.params.id.toLowerCase();
  this.db.getCourseById(id, function(error, course) {
    if(error || !course) {
      res.send(res_404, 404);
    } else { 
      res.render('course', {
        id: course.id,
        title: course.title
      });
    }
  });
};
