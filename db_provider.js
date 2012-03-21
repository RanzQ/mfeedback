var mongodb = require('mongodb')
  , Db = mongodb.Db
  , Connection = mongodb.Connection
  , Server = mongodb.Server
  , BSON = mongodb.BSON
  , ObjectID = mongodb.ObjectID;

//var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
//var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

//var dbName = 'node-mongo-w'

/**
 * Create a new database connection and a capped 'messages' collection if required
 *
 * @param {String} host
 * @param {Integer} port
 *
 */

exports = module.exports = DatabaseProvider;

var app = DatabaseProvider.prototype;

function DatabaseProvider(dbName, host, port) {
    this.dbName = dbName;
    this.db = new Db(dbName, new Server(host, port, {auto_reconnect: true}, {}));
    //var db = this.db;
    this.db.open(function(error, db) {
        db.collection('system.namespaces', function(error, namespace_collection) {
            if (error) {
                console.log('Something went wrong!');
                console.log(error);
                return;
            }
            /*namespace_collection.find({'name': dbName + '.courses'}).toArray(function(error, result) {
                if(error) {
                    console.log(error); 
                    return;
                } else if (result.length !== 0) { 
                    console.log("Collection 'courses' already exists. Skipping its creation..."); 
                    return;
                }
                db.createCollection('courses', {autoIndexId:true}, function(error, collection) {
                    if (error) { 
                        console.log(error); 
                        return;
                    }
                    collection.ensureIndex({'id':1}, {'unique':true}, function(error, indexName) {
                        if (error) {
                            console.log(error); 
                            return; 
                        }
                        console.log("Index added for " + indexName);
                        console.log("Collection 'courses' created.");
                    });        
                });
            });*/
            /*namespace_collection.find({'name': dbName + '.feedback'}).toArray(function(error, result) {
                if(error) {
                    console.log(error); 
                    return;
                } else if (result.length !== 0) { 
                    console.log("Collection 'feedback' already exists. Skipping its creation..."); 
                    return;
                }
                db.createCollection('feedback', {autoIndexId:true}, function(error, collection) {
                    if (error) { 
                        console.log(error); 
                        return;
                    }
                    collection.ensureIndex({'courseId':1}, {'targetId':1}, function(error, indexName) {
                        if (error) {
                            console.log(error); 
                            return; 
                        }
                        console.log("Index added for " + indexName);
                        console.log("Collection 'feedback' created.");
                    });        
                });
            }); */
        });    
    });
}

app.getDatabaseName = function() {
    return this.dbName;
};

/**
 * Close the DB connection
 */
app.close = function() {
    this.db.close();
};

/* 
 * Get the 'courses' collection
 *
 * @return something?
 */

app.getCourseCollection = function(callback) {
  var db = this.db;
  db.collection('courses', function(error, course_collection) {
      if (error) callback(error);
      else callback(null, course_collection);
  });
};

/**
 * Add a new course
 * 
 *      @param {String} course.id - id of the course
 *      @param {String} course.title - title of the course
 */
app.addCourse = function(course, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.insert({
      'id': course.id,
      'title': course.title
    }, function(error, doc) {
      if (error) callback(error);
      else callback(null, doc);
    });       
  });
};

app.getCourses = function(callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.find().toArray(function(error, results) {
      if (error) {callback(error); return;}
      callback(null, results);
    });
  });
};

app.getCourse = function(id, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.findOne({'id': id}, function(error, result) {
      if (error) {callback(error); return;}
      callback(null, result);
    });
  });
};

/**
 * Add a lecture
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} lecture - lecture to add
 */
app.addLecture = function(courseId, lecture, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) {callback(error); return;}
    course_collection.update({'id': courseId}, {'$push': {'lectures': {
      'number': lecture.number,
      'title': lecture.title,
      'date': lecture.date
    }}}, function(error, doc) {
      if (error) {callback(error); return;}
      callback(null, doc);
    });
  });
};

/**
 * Add an assignment
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} assignment - assignment to add
 */
app.addAssignment = function(courseId, assignment, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.update({'id': courseId}, {'$push': {'assignments' : {
      'number': assignment.number,
      'title': assignment.title,
      'date': assignment.date
    }}}, function(error, doc) {
      if (error) {callback(error); return;}
      callback(null, doc);
    });
  });
};

/**
 * Add an exam
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} exam - exam to add
 */
app.addExam = function(courseId, exam, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.update({'id': courseId}, {'$push': {'exams': {
      'date': exam.date
    }}}, function(error, doc) {
      if (error) {callback(error); return;}
      callback(null, doc);
    });
  });
};

/**
 * Add feedback
 * 
 *      @param {String} courseId - id of the course
 *      @param {String} type - 'lecture', 'assignment' or 'exam'
 *      @param {String} id - number of lecture/assignment or date of exam
 */
app.addFeedback = function(courseId, type, id, feedback) {
  if (type !== 'lecture' /*&& type !== 'assignment' && type !== 'exam'*/) {
    callback('Invalid type.');
  }
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.update({'id' : courseId, 'lectures.number': id}, {
      '$push': {'lectures.$.feedback': {
        'body': feedback
    }}}, function(error, doc) {
      if (error) {callback(error); return;}
      callback(null, doc);
    });
  });
};
