var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var UserOnlineSchema = new Schema({
    name: {type: String, default: ""},
    userID: {type: Number, ref:"User"}
}, {
    versionKey: false
});

UserOnlineSchema.plugin(autoIncrement.plugin, 'UserOnline');
module.exports  = mongoose.model('UserOnline', UserOnlineSchema);