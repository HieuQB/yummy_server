var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');
var User = require('./UserModel');

var RateSchema = new Schema({
    meeting: {type: Number, ref: 'Meeting', required: true},
    creator: {type: Number, ref: 'User',required: true},
    people_evaluate: {type: Number, ref: 'User',required: true},
    created_date: {type: Date, default: Date.now()},
    content: {type: String, required: true},
    point: {type: Number,required: true, default: 5}
}, {
    usePushEach: true,
    versionKey: false
});

// function addJoinPeopleToDatabase(joined_people, callback) {
//     var data = [];
//     if(joined_people == null || joined_people.length === 0)
//         return callback(data);
//     var count = joined_people.length;
//     joined_people.forEach((_id) => {
//         var joined_people = User.findById(_id).exec((err, joined_people) => {
//             if (err) {
//                 res.json({
//                     success: false,
//                     data: {},
//                     message: `error is : ${err}`
//                 });
//             }
//             data.push(joined_people);
//             count--;
//             if(count === 0) {
//                 callback(data);
//             }
//         });

//     });
// }


RateSchema.plugin(autoIncrement.plugin, 'Rate');
module.exports  = mongoose.model('Rate', RateSchema);
// module.exports.addJoinPeopleToDatabase = addJoinPeopleToDatabase;