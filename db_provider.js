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
            namespace_collection.find({'name': dbName + '.courses'}).toArray(function(error, result) {
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
            });
            namespace_collection.find({'name': dbName + '.feedback'}).toArray(function(error, result) {
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
            }); 
        });    
    });
};

app.getDatabaseName = function() {
    return this.dbName;
}

/**
 * Close the DB connection
 */
app.close = function() {
    this.db.close();
}

/* 
 * Get the 'courses' collection
 *
 * @return something?
 */

app.getCourseCollection = function(callback) {
  var db = this.db;
  db.collection('courses', function(error, course_collection) {
    if (error) {
      callback(error);
    } else {
      callback(null, course_collection);
    }
  });
}

/**
 * Add a new course
 * 
 *      @param {String} course.id - id of the course
 *      @param {String} course.title - title of the course
 */
app.addCourse = function(course, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.insert(
      { 'id':course.id, 'title':course.title },
      function(error, doc) {
        error ? callback(error) : callback(null, doc);
      }
    );       
  });
}

app.getCourses = function(callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.find().toArray(function(error, results) {
      if (error) { callback(error); return; }
      callback(null, results);
    });
  });
}

app.getCourse = function(id, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.findOne({'id': id}, function(error, result) {
      if (error) { callback(error); return; }
      callback(null, result);
    });
  });
}

/**
 * Add a lecture
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} lecture - lecture to add
 */
app.addLecture = function(courseId, lecture, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.update( {
      'id' : courseId
    }, {
      '$push' : {
        'lectures' : {
          'number': lecture.number,
          'title':  lecture.title,
          'date':   lecture.date
        }
      }
    }), function(error, doc) {
      error ? callback(error) : callback(null, doc);
    }   
  });
}

/**
 * Add an assignment
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} assignment - assignment to add
 */
app.addAssignment = function(courseId, assignment, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.update( {
      'id' : courseId
    }, {
      '$push' : {
        'assignments' : {
          'number': assignment.number,
          'title':  assignment.title,
          'date':   assignment.date
        }
      }
    }), function(error, doc) {
      error ? callback(error) : callback(null, doc);
    }   
  });
}

/**
 * Add an exam
 * 
 *      @param {String} courseId - id of the course
 *      @param {Object} exam - exam to add
 */
app.addExam = function(courseId, exam, callback) {
  this.getCourseCollection(function(error, course_collection) {
    if (error) { callback(error); return; }
    course_collection.update( {
      'id' : courseId
    }, {
      '$push' : {
        'exams' : {
          'date': exam.date
        }
      }
    }), function(error, doc) {
      error ? callback(error) : callback(null, doc);
    }   
  });
}



/**
 *
 *
 */
// app.setMessageHilight = function(messageId, val, callback) {
//     var db = this.db;
//     this.getMessageCollection(function(error, message_collection) {
//         if (error) { callback(error); return; }
//         message_collection.update(
//             {'_id': new db.bson_serializer.ObjectID(messageId)},
//             {$set: {'hl': val} },
//             function(error) {
//                 if (error) callback(error);
//                 else callback(null);
//             }
//         );
//     });  
// }

/**
 *
 *
 */
// app.setMessageVisibility = function(messageId, val, callback) {
//     var db = this.db;
//     this.getMessageCollection(function(error, message_collection) {
//         if (error) { callback(error); return; }      
//         message_collection.update(
//             {'_id': new db.bson_serializer.ObjectID(messageId)},
//             {$set: {'hide': val} },
//             function(error) {
//                 if (error) callback(error);
//                 else callback(null);
//             }
//         );     
//     });  
// }


/** 
 * Return all the messages associated with id
 * 
 * @param {String} cid - the channel id
 * @return {Array} result - an array of messages matching the query
 */
// app.getCappedBacklog = function(cid, callback) {
//     this.getMessageCollection(function(error, message_collection) {
//         if (error) { callback(error); return; }
//         // Find all messages where channel id == id and return results sorted in reverse order in an array
//         message_collection.find({'cid': cid}, {'cid': 0}).sort({'$natural':-1}).toArray(function(error, result) {
//             if (error) {
//                 callback(error);
//             } else {
//                 callback(null, result);
//             }
//         });      
//     });
// }

// app.getMessages = function(cid, skipCount, messagesPerPage, callback) {
//     this.getMessageCollection(function(error, message_collection) {
//         if (error) {
//             callback(error);
//             return;
//         } 
//         // Find all messages where channel id == id and return results sorted in reverse order in an array
//         message_collection.find({'cid': cid}, {'cid': 0}).skip((skipCount-1)*messagesPerPage).sort({'$natural':-1}).limit(messagesPerPage).toArray(function(error, result) {
//             if (error) {
//                 callback(error);
//             } else {
//                 callback(null, result);
//             }
//         });      
//     });
// }
//
// app.getMessagesByChannelId = function(cid, callback) {
//     this.getMessageCollection(function(error, message_collection) {
//         if (error) { callback(error); return; }
//         // Find all messages where channel id == id and return results sorted in reverse order in an array
//         message_collection.find({'cid': cid}, {'cid': 0}).sort({'$natural':-1}).toArray(function(error, result) {
//             if (error) {
//                 callback(error);
//             } else {
//                 callback(null, result);
//             }
//         });       
//     });
// }
//
// app.getMessageById = function(messageId, callback) {
//     var db = this.db;
//     this.getMessageCollection(function(error, message_collection) {
//         if (error) { callback(error); return; }
//
//         message_collection.findOne({'_id':new db.bson_serializer.ObjectID(messageId)}, function(error, result) {
//             if (error) callback(error);
//             else callback(null, result);
//         });
//     });
// }

/**
 * Get the 'polls' collection
 *
 * @param {Function} callback
 * @return {Collection}
 */
// app.getPollCollection = function(callback) {
//     this.db.collection('polls', function(error, poll_collection) {
//         if (error) callback(error);
//         else callback(null, poll_collection);
//     });
// }


/**
 * Get a single poll matching an id
 *
 * @param {String} pid - poll ID
 * @return {Object}
 */
// app.getPollById = function(pid, callback) {
//     var db = this.db;
//     this.getPollCollection(function(error, poll_collection) {
//         if (error) { callback(error); return; }
//         poll_collection.findOne({'_id': new db.bson_serializer.ObjectID(pid)}, function(error, result) {
//             if (error) callback(error);
//             else callback(null, result);
//         });
//     });
// }


/**
 * Add a vote to a poll option
 *
 * @param {String} pid - poll id
 * @param {String} option_id
 *
 * @return {String} error on error, otherwise null
 */
// app.addVote = function(pid, optionId, callback) {
//     var db = this.db;
//     this.getPollCollection(function(error, poll_collection) {
//         if (error) { callback(error); return; }
//         poll_collection.update(
//             {'_id': new db.bson_serializer.ObjectID(pid), 'options.id':optionId}, 
//             {$inc:{'options.$.votes':1}}, 
//             {'safe':true}, 
//             function(error, result) {
//                 if (error) callback(error);
//                 else callback(null);
//             }
//         ); 
//     });
// }
//
//
// app.getLectureCollection = function(callback) {
//     this.db.collection('lectures', function(error, lecture_collection) {
//         if (error) callback(error);
//         else callback(null, lecture_collection);
//     });
// }

/*  
    _id: '123abcjotaki',
    owner: 'Teemu Teekkari',    //username for the owner of this lecture
    title: 'Luento 1',          //title of the lecture
    lid: '1',                   //lecture id
    pin: '',                    //controller pin code
    state_c: '1',               //state variables for the controller of this lecture
    state_s: '1',               //state variables for the student view of this lecture
    state_b: '1',               //state variables for the bigscreen view of this lecture
    events:
*/

// app.addLecture = function(data, callback) {
//     this.getLectureCollection(function(error, lecture_collection) {
//         if (error) { callback(error); return; }
//         lecture_collection.insert(
//             {
//              lid: data.lid,                // Lecture ID
//              title: data.title,           // Lecture title
//              owner: data.owner,
//              pin: data.pin,
//              state_c: data.state_c,
//              state_s: data.state_s,
//              state_b: data.state_b,
//              next_event_id: 1,
//              events: data.events
//             },function(error, doc) {
//                 if (error) callback(error);
//                 else callback(null, doc);
//             }
//         );
//     });
// }
//
// app.removeLecture = function(lid, callback) {
//     this.getLectureCollection(function(error, lecture_collection) {
//         if(error) { callback(error); return; }
//         lecture_collection.remove({lid: lid}, function(error) {
//             if(error) { callback(error); return; }
//             callback(null);
//         });
//     });
// }; 
//
// app.getLectures = function(callback) {
//     this.getLectureCollection(function(error, lecture_collection) {
//         if (error) { callback(error); return; }
//         lecture_collection.find().toArray(function(error, results) {
//             if (error) { callback(error); return; }
//             callback(null, results);
//         });
//     });
// }
//
//
// app.getLectureById = function(lid, callback) {
//     this.getLectureCollection(function(error, lecture_collection) {
//         if (error) { callback(error); return; }
//         lecture_collection.findOne({'lid': lid}, function(error, result) {
//             if (error) callback(error);
//             else callback(null, result);
//         });
//     });
// }
//
// app.addEventToLecture = function(lid, eventData, callback) {
//     var db = this.db;
//     var self = this;
//     this.getLectureCollection(function(error, lecture_collection) {
//         if (error) { callback(error); return; }
//         lecture_collection.findOne({'lid': lid}, function(error, lecture) {
//             if (error) { callback(error); return; }
//
//             var eid = lecture.next_event_id;
//
//             lecture_collection.update({'lid': lid}, {'$inc': {'next_event_id': 1} },
//                 function(error, result) {
//                     if (error) { callback(error); return; }
//                 }
//             );
//
//             var event = {
//                 'eid': eid,
//                 'type': eventData.type,
//                 'title': eventData.title,
//                 'auth': false
//             };
//
//             if (eventData.type === 'poll') {
//
//                 // DUMMY DATA //
//                 //eventData.question = 'Does this make any sense?';
//                 //eventData.options = [{'id':'1', 'text':'yes', 'votes':0}, {'id':'2', 'text':'no', 'votes':0}, {'id':'3', 'text':'maybe', 'votes':0}];
//                 // END DUMMY DATA //
//
//                 self.getPollCollection(function(error, poll_collection) {
//                     if (error) { callback(error); return; }
//                     poll_collection.insert(
//                         {'question': eventData.question,
//                          'options': eventData.options},
//                         function(error, doc) {
//                             if (error) { callback(error); return; }
//                             console.log(doc[0]);
//                             console.log(doc[0]._id);
//                             event.pid = doc[0]._id.toString();      
//                 
//                             lecture_collection.update({'lid': lid}, {'$push': {'events': event } },
//                                 function(error, result) {
//                                     if (error) { callback(error); return; }
//                                     // Return the assigned event ID
//                                     callback(null, eid);
//                                 }
//                             );
//                         }
//                     ); 
//                 });
//                 // Don't continue updating the database if the event was poll
//                 return;
//             }
//
//             lecture_collection.update({'lid': lid}, {'$push': {'events': event } },
//                 function(error, result) {
//                     if (error) { callback(error); return; }
//                     // Return the assigned event ID
//                     callback(null, eid);
//                 }
//             );
//         });
//     });
// }

/*
    Destroy every event in the eventIdList
    If the list is null, destroy all events
*/
// app.destroyLectureEvents = function(lid, eventIdList, callback) {
//     this.getLectureCollection(function(error, lecture_collection) {
//         if (error) { callback(error); return; }
//
//         if (!eventIdList) {
//             lecture_collection.update({'lid': lid}, {'$set': {'events': [] } },
//             function(error) {
//                 if (error) { callback(error); return; }
//                 callback(null, 'events');
//                 lecture_collection.update({'lid': lid}, {'$set': {'state_s': 0 } },
//                 function(error) {
//                     if (error) { callback(error); return; }
//                     callback(null, 'student');
//                     lecture_collection.update({'lid': lid}, {'$set': {'state_b': 0 } },
//                     function(error) {
//                         if (error) { callback(error); return; }
//                         callback(null, 'bigscreen');
//                     });
//                 });
//             });
//             return;
//         }
//
//         lecture_collection.findOne({'lid': lid}, function(error, lecture) {
//             if (error) { callback(error); return; }
//             var state_s = lecture.state_s
//               , state_b = lecture.state_b
//               , eid = 0;
//             
//             for (var i = 0; i < eventIdList.length; i++) {
//                 eid = eventIdList[i];
//                 if (state_s === eid) {
//                     lecture_collection.update({'lid': lid}, {'$set': {'state_s': 0 } },
//                     function(error) {
//                         if (error) { callback(error); return; }
//                         callback(null, 'student');
//                     });
//                 }
//                 if (state_b === eid) {
//                     lecture_collection.update({'lid': lid}, {'$set': {'state_b': 0 } },
//                     function(error) {
//                         if (error) { callback(error); return; }
//                         callback(null, 'bigscreen')
//                     });
//                 }
//                 lecture_collection.update({'lid': lid}, {'$pull': {'events': {'eid': eid} } },
//                 function(error) {
//                     if (error) { callback(error); return; }
//                 });
//             }
//         });
//         callback(null, 'events');
//         return;
//     });
// }
//
// app.getLectureEventById = function(lid, eid, callback) {
//     this.getLectureCollection(function(error, lecture_collection) {
//         if (error) { callback(error); return; }
//
//         lecture_collection.findOne({'lid': lid}, function(error, lecture) {
//             if (error) { callback(error); return; }
//
//             for (var i = 0; i < lecture.events.length; i++) {
//                 if (lecture.events[i].eid === eid) {
//                     callback(null, lecture.events[i]);
//                     return;
//                 }
//             }
//             callback(null, null);
//         });
//     });
// }
//
// app.changeLectureState = function(lid, state_data, callback) {
//     this.getLectureCollection(function(error, lecture_collection) {
//         if (error) { callback(error); return; }
//         
//         if (state_data.target === 'student') {
//             lecture_collection.update({'lid': lid}, {$set: {state_s: state_data.state} }, 
//             function(error, result) {
//                 if (error) callback(error);
//                 else callback(null, result);
//             });
//         } else if (state_data.target === 'bigscreen') {
//             lecture_collection.update({'lid': lid}, {$set: {state_b: state_data.state} }, 
//             function(error, result) {
//                 if (error) callback(error);
//                 else callback(null, result);
//             });
//         } else if (state_data.target === 'controller') {
//             lecture_collection.update({'lid': lid}, {$set: {state_c: state_data.state} }, 
//             function(error, result) {
//                 if (error) callback(error);
//                 else callback(null, result);
//             });
//         }
//     });
// }








