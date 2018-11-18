var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var RatingAverageSchema = new Schema({
    user: {type: Number, ref: 'User',required: true},
    point_sum: {type: Number, default:0},
    count_people: {type: Number, default:0},
}, {
    versionKey: false
});

RatingAverageSchema.plugin(autoIncrement.plugin, 'RatingAverage');
module.exports  = mongoose.model('RatingAverage', RatingAverageSchema);