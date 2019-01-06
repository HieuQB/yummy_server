var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var ListChatSchema = new Schema({
    to: {type: Number, ref:"User"},
    lastMessage: {type: String},
    lastDate: {type: Date},
    from: {type: Number, ref: "User"}
}, {
    versionKey: false
});

ListChatSchema.plugin(autoIncrement.plugin, 'ListChat');
module.exports  = mongoose.model('ListChat', ListChatSchema);