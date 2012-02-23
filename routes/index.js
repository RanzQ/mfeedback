
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Mobile Feedback for Aalto Courses' })
};
