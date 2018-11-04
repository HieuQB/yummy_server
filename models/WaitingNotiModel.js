var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var WaitingNotiSchema = new Schema({
    userID: {type: Number, ref:"User"},
    dataNoti: {type: Number, ref: "Notification"}
}, {
    versionKey: false
});

WaitingNotiSchema.plugin(autoIncrement.plugin, 'WaitingNoti');
module.exports  = mongoose.model('WaitingNoti', WaitingNotiSchema);