var mongoose = require('mongoose');

exports = module.exports = DatabaseProvider;

var app = DatabaseProvider.prototype;

function DatabaseProvider(dbName) {

  this.dbName = dbName;
  mongoose.connect('mongodb://localhost/' + dbName);

  var Schema = mongoose.Schema;

  var FeedbackSchema = new Schema({
        date : { type: Date, index: true, 'default': Date.now },
        body : String
    })
    , LectureSchema = new Schema({
        number    : { type: Number, min: 1, index: true }
      , title     : String
      , date      : Date
      , feedbacks : [FeedbackSchema]
    })
    , AssignmentSchema = new Schema({
        number  : { type: Number, min: 1, index: true }
      , title   : String
      , date    : Date
      , feedbacks : [FeedbackSchema]
    })
    , ExamSchema = new Schema({
        date      : { type: Date, index: true }
      , feedbacks : [FeedbackSchema]
    })
    , CourseSchema = new Schema({
        title       : String
      , id          : { type: String, index: true, unique: true }
      , department  : { type: String, index: true }
      , lectures    : [LectureSchema]
      , assignments : [AssignmentSchema]
      , exams       : [ExamSchema]
      , feedbacks   : [FeedbackSchema]
    })
    , DepartmentSchema = new Schema({
        title        : String
      , id           : { type: String, index: true, unique: true }
      , organization : String
    })
    , OrganizationSchema = new Schema({
        title       : { type: String, index: true, unique: true }
      , id          : { type: String, index: true, unique: true }  
    });

  this.organizations = mongoose.model('Organization', OrganizationSchema);
  this.departments = mongoose.model('Department', DepartmentSchema);
  this.courses = mongoose.model('Course', CourseSchema);

}

app.getDatabaseName = function() {
  return this.dbName;
};

/**
 * Close the DB connection
 */
app.close = function() {
  mongoose.disconnect();
};

/**
 * Add a new course
 * 
 *      @param {Object} course 
 */
app.addCourse = function(course, callback) {
  var newCourse = new this.courses(course);
  newCourse.save(function (err) {
    if (err) {callback(err); return;}
    callback(null);
  });
};

app.getCoursesByDepartment = function(depId, callback) {
  this.courses.find({'department': depId}, function (err, docs) {
    if (err) {callback(err); return;}
    callback(null, docs);  
  });
};

app.getCourse = function(id, callback) {
  this.courses.findOne({'id': id}, function(err, doc) {
    if (err) {callback(err); return;}
    callback(null, doc);  
  });
};

/**
 * Add a lecture
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} lecture - lecture to add
 */
app.addLecture = function(courseId, lecture, callback) {

  this.courses.findOne({'id': courseId}, function(err, course) {
    if (err) {callback(err); return;}
    course.lectures.push(lecture, {upsert: true}, function(err) {
      if (err) {callback(err); return;}
      callback(null);  
    });
  });
};

app.getOrganizations = function(callback) {
  this.organizations.find({}, function(err,docs) {
    if (err) {callback(err); return;}
    callback(null, docs);     
  });
};

app.getOrganization = function(id, callback) {
  this.organizations.find({'id': id}, function(err,doc) {
    if (err) {callback(err); return;}
    callback(null, doc);     
  });
};

app.getDepartmentsByOrganization = function(orgId, callback) {
  this.departments.find({'organization': orgId}, function(err,doc) {
    if (err) {callback(err); return;}
    callback(null, doc);     
  });
};

/**
 * Add an assignment
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} assignment - assignment to add
 */
app.addAssignment = function(courseId, assignment, callback) {
  this.courses.update({'id': courseId}, {'$push': {
    'assignments': assignment
  }}, { upsert: true }, function(err) {
    if (err) {callback(err); return;}
    callback(null);
  });
};

/**
 * Add an exam
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} exam - exam to add
 */
app.addExam = function(courseId, exam, callback) {
  this.courses.update({'id': courseId}, {'$push': {
    'exams': exam
  }}, { upsert: true }, function(err) {
    if (err) {callback(err); return;}
    callback(null);
  });
};

/**
 * Add feedback
 * 
 *      @param {String} courseId - id of the course
 *      @param {String} type - 'lecture', 'assignment' or 'exam'
 *      @param {String} id - number of lecture/assignment or date of exam
 *      @param {String} feedback - feedback text
 */
app.addFeedback = function(courseId, type, id, feedback, callback) {
  timestamp = new Date();
  if (type == 'course') {
    this.courses.update({'id' : courseId}, { '$push': {'feedbacks': {
        'body': feedback,
        'date': timestamp
      }}}, { upsert: true }, function(err, doc) {
      if (err) {callback(err); return;}
      callback(null, doc);
    });
  } else if (type == 'lecture') {
    this.courses.update({'id' : courseId, 'lectures.number': id}, {
      '$push': {'lectures.$.feedbacks': {
        'body': feedback,
        'date': timestamp
      }}}, { upsert: true }, function(err, doc) {
      if (err) {callback(err); return;}
      callback(null, doc);
    });
  } else if (type == 'assignment') {
    this.courses.update({'id' : courseId, 'assignments.number': id}, {
      '$push': {'assignments.$.feedbacks': {
        'body': feedback,
        'date': timestamp
      }}}, { upsert: true }, function(err, doc) {
      if (err) {callback(err); return;}
      callback(null, doc);
    });
  } else if (type == 'exam') {
    this.courses.update({'id' : courseId, 'exams.date': id}, {
      '$push': {'exams.$.feedbacks': {
        'body': feedback,
        'date': timestamp
      }}}, { upsert: true }, function(err, doc) {
      if (err) {callback(err); return;}
      callback(null, doc);
    });
  } else {
    callback('Invalid type.');
  }
};
