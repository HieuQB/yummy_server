var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = require('./UserModel');
var autoIncrement = require('mongoose-auto-increment-fix');

//status_reaction:
//like: 1
//dislike: 2

var ReactionSchema = new Schema({
    creator: {type: Number,  ref: 'User'},
    status_reaction : {
        type : Number,
        require: true
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
ReactionSchema.plugin(autoIncrement.plugin, {model: 'Reaction', startAt:1});
module.exports = mongoose.model('Reaction', ReactionSchema);