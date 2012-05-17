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

  var ReplySchema = new Schema({
        'date': Date,
        'body': String
      })

    , FeedbackSchema = new Schema({
        'date' : {
          'type': Date,
          'index': true,
          'default': Date.now
        },
        'body' : String,
        'votes': {
          'up' : Number,
          'down' : Number
        },
        'replies': [ReplySchema]
      })

    , CourseFeedbackSchema = new Schema({
        'date' : {
          'type': Date,
          'index': true,
          'default': Date.now
        },
        'body' : String,
        'book': Number,
        'exam': Number,        
        'exercises': Number,
        'overall': Number
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
        'feedbacks': [FeedbackSchema],
        'votes': {
          'up' : Number,
          'down' : Number
        }
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
        'date': Date,
        'feedbacks': [FeedbackSchema],
        'votes': {
          'up' : Number,
          'down' : Number
        }
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
        'feedbacks': [FeedbackSchema],
        'votes': {
          'up' : Number,
          'down' : Number
        }
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
        'feedbacks': [CourseFeedbackSchema],
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

  var fam = function (query, sort, doc, options, callback) {
    return this.collection.findAndModify(query, sort, doc, options, callback);
  };

  LectureSchema.statics.findAndModify = fam;
  ExamSchema.statics.findAndModify = fam;
  AssignmentSchema.statics.findAndModify = fam;
  CourseSchema.statics.findAndModify = fam;

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
// app.addCourse = function(course, callback) {
//   var newCourse = new this.courses(course);
//   newCourse.save(function (err) {
//     if (err) {callback(err); return;}
//     callback(null);
//   });
// };

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
    , id = options.courseId
    , filters = options.filters;

  console.log(options);

  this.courses.findOne({'id': id}, function(err, doc) {
    console.log(err);
    console.log(doc);
    if (err || !doc) {callback(err); return;}

    var course = doc;
    if (options.populateEvents === true) {
      populateEvents(self, course, filters, callback);
    } else {
      callback(null, course);
    }
  });
};

function populateEvents(self, course, filters, callback) {
  console.log(filters);
  var db_query = {'_parent': course._id};
  for (var i in filters) {
    db_query[i] = filters[i];
  }
  //console.log(db_query);
  self.assignments.find(
      db_query, [],
      {'sort': {'deadline': -1}}, function(err, assignments) {
        course.assignments = assignments;
        self.exams.find(
            db_query, [],
            {'sort': {'date': -1}}, function(err, exams) {
              course.exams = exams;
              self.lectures.find(
                  db_query, [],
                  {'sort': {'date': -1}}, function(err, lectures) {
                    course.lectures = lectures;
                    callback(null, course);
                  });
            });
      });
}

app.getPage = function(options, callback) {
  var self = this
    , collection = options.collection
    , courseId = options.courseId
    , page = options.page
    , itemsPerPage = options.perPage
    , filters = options.filters;

    // for (var i in filters) {
    //   db_query[i] = filters[i];
    // }

    //console.log(db_query);

    this.courses.findOne({'id': courseId}, function(err, course) {
      //console.log(course);
      var db_query = {'_parent': course._id};
      for (var i in filters) {
        db_query[i] = filters[i];
      }
      self[collection].find(db_query, [],
      {
        sort: {'date': -1},
        skip: ((page-1)*itemsPerPage),
        limit: itemsPerPage + 1
      },
      function(err, result) {
        if (err) {callback(err); return;}
        callback(null, result);
      });
    });
};

// app.getLecture = function(options, callback) {
//   var date = options.date
//     , courseId = options.courseId
//     , self = this;
//   this.courses.findOne({'id': courseId}, function(err, doc){
//     if (err || !doc) {callback(err); return;}
//       self.lectures.findOne({'_parent': doc._id, 'date': date})
//       .run(function(err, doc) {
//         if (err || !doc) {callback(err); return;}
//         callback(null, doc);
//       });
//   });
// };

// app.getExam = function(options, callback) {
//   var date = options.date
//     , courseId = options.courseId
//     , self = this;
//   this.courses.findOne({'id': courseId}, function(err, doc){
//     if (err || !doc) {callback(err); return;}
//       self.exams.findOne({'_parent': doc._id, 'date': date})
//       .run(function(err, doc) {
//         if (err || !doc) {callback(err); return;}
//         callback(null, doc);
//       });
//   });
// };

// app.getAssignment = function(options, callback) {
//   var date = options.date
//     , courseId = options.courseId
//     , self = this;
//   this.courses.findOne({'id': courseId}, function(err, doc){
//     if (err || !doc) {callback(err); return;}
//       self.assignments.findOne({'_parent': doc._id, 'deadline': date})
//       .run(function(err, doc) {
//         if (err || !doc) {callback(err); return;}
//         callback(null, doc);
//       });
//   });
// };

app.getCourseEvent = function(options, callback) {
  var date = options.date
    , courseId = options.courseId
    , type = options.type + 's'
    , self = this;

  this.courses.findOne({'id': courseId}, function(err, doc){
    if (err || !doc) {callback(err); return;}
      self[type].findOne({'_parent': doc._id, 'date': date})
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
// app.addLecture = function(courseId, lecture, callback) {
//   this.courses.findOne({'id': courseId}, function(err, course) {
//     if (err) {callback(err); return;}
//     course.lectures.push(lecture, {upsert: true}, function(err) {
//       if (err) {callback(err); return;}
//       callback(null);
//     });
//   });
// };

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
// app.addAssignment = function(courseId, assignment, callback) {
//   this.courses.update({'id': courseId}, {'$push': {
//     'assignments': assignment
//   }}, { upsert: true }, function(err) {
//     if (err) {callback(err); return;}
//     callback(null);
//   });
// };

/**
 * Add an exam
 *
 *      @param {String} courseId - id of the course
 *      @param {Object} exam - exam to add
 */
// app.addExam = function(courseId, exam, callback) {
//   this.courses.update({'id': courseId}, {'$push': {
//     'exams': exam
//   }}, { upsert: true }, function(err) {
//     if (err) {callback(err); return;}
//     callback(null);
//   });
// };

/**
 * Add feedback
 *
 *      @param {String} courseId - the id of the course
 *      @param {String} type - 'lecture', 'assignment' or 'exam'
 *      @param {String} date - date or deadline
 *      @param {String} feedback - feedback text
 */
app.addFeedback = function(courseId, type, date, feedback, callback) {
  var self = this
    , collection = type + 's'
    , update_query = {}
    , vote = {}
    , timestamp = new Date()
    , feedbackBody = {}
    , feedbackid = feedback.feedbackid
    , isNew = (feedbackid === undefined)
    , isVote = (feedback.body === undefined)
    , isReply = !isVote;

  if (isVote) {
    vote['votes.' + feedback.votetype] = 1;
    update_query = {'$inc': vote};
  } else if (type === 'course') {
    feedbackBody = {
      'body': feedback.body,
      'date': timestamp,
      'book': feedback.book,
      'exercises': feedback.exercises,
      'exam': feedback.exam,
      'overall': feedback.overall
    };
  } else {
    feedbackBody = {'body': feedback.body, 'date': timestamp};
  }

  // console.log('db_provider 466:', feedback);

  // Case: course feedback
  if (type === 'course') {
    self.courses.findOne( {'id': courseId}, function(err, course) {
        if (err || !course) {callback(err); return;}
        course.feedbacks.push(feedbackBody);
        course.save(function(err, doc) {
          callback(err, doc);
        });
      }
    );
    return;
  }

  // console.log('db_provider 480:', update_query);

  self.courses.findOne({'id': courseId}, {'_id': 1}, function(err, course) {
    // Case: add a vote
    if (feedbackid === undefined && isVote) {
      self[collection].findAndModify(
        {'_parent': course._id, 'date': date}, [],
        update_query, {'new': true},
        function(err, doc) {
          if (err || !doc) {callback(err); return;}
          callback(err, doc);
        }
      );
      return;
    }

    self[collection].findOne({'_parent': course._id, 'date': date}, function(err, doc) {
      if (err || !doc) {callback(err); return;}

      var fb = null;
      if (isNew) {
        // Case: add new feedback
        doc.feedbacks.push(feedbackBody);
      } else if (isReply) {
        // Case: add reply to feedback
        fb = doc.feedbacks.id(feedbackid);
        fb.replies.push(feedbackBody);
      } else {
        // Case: add vote for feedback
        fb = doc.feedbacks.id(feedbackid);
        var votetype = feedback.votetype;
        try {
          var v = fb.votes[votetype];
          fb.votes[votetype] = v ? v + 1 : 1;
        } catch(e) {
          fb.votes = {};
          fb.votes[votetype] = 1;
        }
        // Override the returned document because Mongoose makes life hard
        var d = {
          votes: {
            'up': parseInt(fb.votes.up, 10),
            'down': parseInt(fb.votes.down, 10)
          }
        };
        doc.save(function(err, doc) {
          callback(err, d);
        });
        // Return early due the the callback firing
        return;
      }

      doc.save(function(err, doc) {
        //console.log(doc);
        callback(err, doc);
      });
    });
  });
};
