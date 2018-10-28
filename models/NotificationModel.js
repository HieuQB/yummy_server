var User = require('./UserModel');
var NotiData = require('./NotiDataModel');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var NotificationSchema = new Schema({
    name: {type: String, default: ""},
    user_id: {type: Number},
    // type: {type: Number,default:0},
    title: {type: String},
    created_date: {type: Date, default: Date.now()},
    content: {type: NotiData},
    image: {type: String, default: ""}
}, {
    versionKey: false
});
NotificationSchema.plugin(autoIncrement.plugin,'Notification');
	
module.exports = mongoose.model('Notification', NotificationSchema);