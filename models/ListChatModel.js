var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var ListChatSchema = new Schema({
    lastMessage: {type: Number, ref: 'Chat'},
    users: [{type: Number, ref:'User'}],
    lastDate: {type:Date, default: Date.now()}
}, {
    versionKey: false
});

ListChatSchema.plugin(autoIncrement.plugin, 'ListChat');
module.exports  = mongoose.model('ListChat', ListChatSchema);