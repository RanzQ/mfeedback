var mongoose = require('mongoose')
  , mongooseAuth = require('mongoose-auth')
  , ObjectId = require('mongoose').Types.ObjectId; 


exports = module.exports = DatabaseProvider;

var app = DatabaseProvider.prototype;

function DatabaseProvider(dbName) {

  this.dbName = dbName;
  mongoose.connect('mongodb://localhost/' + dbName);

  var Schema = mongoose.Schema
    , UserSchema = new Schema({})
    , User;

  UserSchema.plugin(mongooseAuth, {

      'everymodule': {
        'everyauth': {
            'User': function() {
              return User;
            }
        }
      },

      'google': {
        'everyauth': {
          'myHostname': 'https://localhost:8080',
          'appId': '74200445392.apps.googleusercontent.com',
          'appSecret': 'dgHPFwwZM3hXDSscjgus6cAY',
          'redirectPath': '/',
          'scope': 'https://www.googleapis.com/auth/userinfo.profile'
        }
      }
  });

  var FeedbackSchema = new Schema({
        'date' : {
          'type': Date,
          'index': true,
          'default': Date.now
        },
        'body' : String
      })

    , LectureSchema = new Schema({
        'course': {
          'type': String,
          'index': true
        },
        '_parent': {
          'type': Schema.ObjectId,
          'ref': 'Course'
        },
        'topic': String,
        'date': {
          'type': Date,
          'index': true
        },
        'feedbacks': [FeedbackSchema]
      })

    , AssignmentSchema = new Schema({
        'course': {
          'type': String,
          'index': true
        },
        '_parent': {
          'type': Schema.ObjectId,
          'ref': 'Course'
        },
        'number': {
          'type': Number,
          'min': 1,
          'index': true
        },
        'title': String,
        'deadline': Date,
        'feedbacks': [FeedbackSchema]
      })

    , ExamSchema = new Schema({
        'course': {
          'type': String,
          'index': true
        },
        '_parent': {
          'type': Schema.ObjectId,
          'ref': 'Course'
        },
        'date': {
          'type': Date,
          'index': true
        },
        'feedbacks': [FeedbackSchema]
      })

    , CourseSchema = new Schema({
        'title': String,
        'id': {
          'type': String,
          'index': true,
          'unique': true
        },
        'department': {
          'type': String,
          'index': true
        },
        'isActive': Boolean,
        'feedbacks': [FeedbackSchema],
        'lectures': [LectureSchema],
        'exams': [ExamSchema],
        'assignments': [AssignmentSchema]
      })

    , DepartmentSchema = new Schema({
        'title': String,
        'id': {
          'type':String,
          'index': true,
          'unique': true
        },
        'organization': String
      })

    , OrganizationSchema = new Schema({
        'title': {
          'type': String,
          'index': true,
          'unique': true
        },
        'id': {
          'type': String,
          'index': true,
          'unique': true
        }
    });

  this.organizations = mongoose.model('Organization', OrganizationSchema);
  this.departments = mongoose.model('Department', DepartmentSchema);
  this.courses = mongoose.model('Course', CourseSchema);
  this.exams = mongoose.model('Exam', ExamSchema);
  this.assignments = mongoose.model('Assignment', AssignmentSchema);
  this.lectures = mongoose.model('Lecture', LectureSchema);
  this.feedback = mongoose.model('Feedback', FeedbackSchema);
  this.users = mongoose.model('User', UserSchema);

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

app.getCoursesByDepartment = function(depId,  activeOnly, callback) {
  var query = {'department': depId};
  if (activeOnly === true) {
    query.isActive = true;
  }
  console.log(query);
  this.courses.find(query, function (err, docs) {
    if (err) {callback(err); return;}
    callback(null, docs);  
  });
};

app.getCourse = function(options, callback) {
  var self = this
    , cb = callback
    , id = options.courseId;

    console.log(options);

  this.courses.findOne({'id': id}, function(err, doc) {
    if (err || !doc) {callback(err); return;}

    var course = doc;
    if (options.populateEvents === true) {
      populateEvents(self, course, callback);
    } else {
      callback(null, course);
    }
  });
};

function populateEvents(self, course, callback) {
  self.assignments.find({'_parent': course._id}, function(err, doc) {
    course.assignments = doc;
    self.exams.find({'_parent': course._id}, function(err, doc) {
      course.exams = doc;
      self.lectures.find({'_parent': course._id}, function(err, doc) {
        course.lectures = doc;
        callback(null, course);
      });
    });
  });
}

app.getLecture = function(options, callback) {
  var date = options.date
    , courseId = options.courseId
    , self = this;
  this.courses.findOne({'id': courseId}, function(err, doc){
    if (err || !doc) {callback(err); return;}
      self.lectures.findOne({'_parent': doc._id, 'date': date})
      .run(function(err, doc) {
        if (err || !doc) {callback(err); return;}
        callback(null, doc);
      });
  });
};

app.getExam = function(options, callback) {
  var date = options.date
    , courseId = options.courseId
    , self = this;
  this.courses.findOne({'id': courseId}, function(err, doc){
    if (err || !doc) {callback(err); return;}
      self.exams.findOne({'_parent': doc._id, 'date': date})
      .run(function(err, doc) {
        if (err || !doc) {callback(err); return;}
        callback(null, doc);
      });
  });
};

app.getAssignment = function(options, callback) {
  var date = options.date
    , courseId = options.courseId
    , self = this;
  this.courses.findOne({'id': courseId}, function(err, doc){
    if (err || !doc) {callback(err); return;}
      self.assignments.findOne({'_parent': doc._id, 'deadline': date})
      .run(function(err, doc) {
        if (err || !doc) {callback(err); return;}
        callback(null, doc);
      });
  });
};

app.searchCourses = function(term, callback) {
  var regexp = null
    , query = []
    , full_query = null;
  if (typeof term !== 'object' || term.length === 0) {
    callback('The term must be an object!');
    return;
  }

  if (term.q && term.q !== '') {
    regexp = new RegExp(term.q, 'i');
    query = [{'title': regexp}, {'id': regexp}];
    full_query = {'isActive':true, '$or': query};
  } else {
    callback('Empty query!', []);
    return;
  } 
  this.courses.find(full_query,
    function (err, docs) {
    if (err) {callback(err); return;}
    callback(null, docs);  
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
  this.organizations.findOne({'id': id}, function(err,doc) {
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

app.getDepartment = function(id, callback) {
  this.departments.findOne({'id': id}, function(err,doc) {
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
 *      @param {String} courseId - the id of the course
 *      @param {String} type - 'lecture', 'assignment' or 'exam'
 *      @param {String} date - date or deadline
 *      @param {String} feedback - feedback text
 */
app.addFeedback = function(courseId, type, date, feedback, callback) {
  var timestamp = new Date()
    , self = this
    , feedbackBody = {'body': feedback, 'date': timestamp}
    , update_query = {'$push': {'feedbacks': feedbackBody}}
    , callback_handler = function(err, doc) {
        callback(err, doc);
      };

  if (type === 'course') {
    self.courses.findOne({'id': courseId}, {'_id': 1}, function() { 
      console.log('Implement me!');
      return;
    });
  }

  self.courses.findOne({'id': courseId}, {'_id': 1}, function(err, doc) {
    if (type === 'lecture') {
      self.lectures.update(
        {'_parent': doc._id, 'date': date},
        update_query,
        callback_handler
      );
    } else if (type === 'assignment') {
      self.assignments.update(
        {'_parent': doc._id, 'deadline': date},
        update_query,
        callback_handler
      );
    } else if (type === 'exam') {
      self.exams.update(
        {'_parent': doc._id, 'date': date}, 
        update_query,
        callback_handler
      );
    } else {
      callback('Invalid type.');
      return;
    }
  });
};

function updateFeedback(self, _id, feedbackBody, callback) {
  feedbackBody.belongsTo = _id;

  var feedback = new self.feedback(feedbackBody);
  feedback.save(
    function(err, doc) {
      console.log(err);
      if (err) {callback(err); return;}
      callback(null, doc);
    });
}
