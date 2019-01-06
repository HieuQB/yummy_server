var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var ChatSchema = new Schema({
    from: {type: Number, ref:"User"},
    to: {type: Number, ref: "User"},
    message: {type: String},
    date: {type: Date, default: Date.now()},
    is_seen: {type: Boolean, default: false},
    users: [{type: Number}]
}, {
    versionKey: false
});

ChatSchema.plugin(autoIncrement.plugin, 'Chat');
module.exports  = mongoose.model('Chat', ChatSchema);