var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = require('./UserModel');
var autoIncrement = require('mongoose-auto-increment-fix');

var CommentSchema = new Schema({
    creator: {type: Number,  ref: 'User'},
    content : {
        type : String,
        default: ""
    },
    created_date: {
        type : Date,
        default: Date.now()
    },
    modify_date:{
        type: Date,
        default: Date.now()
    }
}, {
    usePushEach: true,
    versionKey: false
});
CommentSchema.plugin(autoIncrement.plugin, 'Comment');

module.exports = mongoose.model('Comment', CommentSchema);