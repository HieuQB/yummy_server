var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = require('./UserModel');
var autoIncrement = require('mongoose-auto-increment-fix');

var InviteSchema = new Schema({
    creator: {type: Number,  ref: 'User'},
    userSearch : {type: Number,  ref: 'User'},
    content: {type: String},
    location: {coordinates: {type: [Number], index: '2d', spherical: true}},
    place: {type: String},
    time: {type: Date,default: Date.now()},
    created_date: {type: Date, default: Date.now()}
}, {
    usePushEach: true,
    versionKey: false
});
InviteSchema.plugin(autoIncrement.plugin,'Invite');

module.exports = mongoose.model('Invite', InviteSchema);