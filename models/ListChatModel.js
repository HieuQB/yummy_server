var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var ListChatSchema = new Schema({
    user: {type: Number, ref:"User"},
    lastMessage: {type: String},
    lastDate: {type: Date}
}, {
    versionKey: false
});

ListChatSchema.plugin(autoIncrement.plugin, 'ListChat');
module.exports  = mongoose.model('ListChat', ListChatSchema);