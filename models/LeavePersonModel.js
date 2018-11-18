var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var LeavePersonSchema = new Schema({
    user: {type: Number, ref: 'User',required: true},
    type: {type: Number, default:1},
    reason: {type: String, default: ""}
}, {
    versionKey: false
});

LeavePersonSchema.plugin(autoIncrement.plugin, 'LeavePerson');
module.exports  = mongoose.model('LeavePerson', LeavePersonSchema);