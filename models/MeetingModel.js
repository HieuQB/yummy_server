var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');
var User = require('./UserModel');
var Rate = require('./RateModel');

var MeetingSchema = new Schema({
    creator: {type: Number, ref: 'User',required: true},
    joined_people: [{type: Number, ref: 'User'}],
    post_id: {type: Number,required: true},
    title: {type: String, default:"Yummy Meeting"},
    created_date: {type: Date, default: Date.now()},
    is_finished: {type: Boolean, default: false},
    location: {coordinates: {type: [Number], index: '2d', spherical: true}},
    comments: [{type: Number, ref: 'Comment'}],
    place: {type: String, default:""},
    time: {type: Date,default: Date.now()}
}, {
    usePushEach: true,
    versionKey: false
});


function addJoinPeopleToDatabase(joined_people, callback) {
    var data = [];
    if(joined_people == null || joined_people.length === 0)
        return callback(data);

    var count = joined_people.length;
    joined_people.forEach((_id) => {
        var joined_people = User.findById(_id).exec((err, joined_people) => {
            if (err) {
                res.json({
                    success: false,
                    data: {},
                    message: `error is : ${err}`
                });
            }
            data.push(joined_people);
            count--;
            if(count === 0) {
                callback(data);
            }
        });

    });
}


MeetingSchema.plugin(autoIncrement.plugin, 'Meeting');
module.exports  = mongoose.model('Meeting', MeetingSchema);
module.exports.addJoinPeopleToDatabase = addJoinPeopleToDatabase;