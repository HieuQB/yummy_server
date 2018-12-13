var User = require('./UserModel');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var NotificationSchema = new Schema({
    user_id: {type: Number},
    title: {type: String},
    created_date: {type: Date, default: Date.now()},
    content: {type: Object},
    image: {type: String, default: ""}
}, {
    versionKey: false
});
NotificationSchema.plugin(autoIncrement.plugin,'Notification');
	
module.exports = mongoose.model('Notification', NotificationSchema);