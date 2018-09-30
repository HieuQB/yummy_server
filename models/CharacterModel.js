var User = require('./UserModel');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var CharacterSchema = new Schema({
    name: {type: String, default: ""}
}, {
    versionKey: false
});
CharacterSchema.plugin(autoIncrement.plugin, {model: 'Character', field: 'id'});
	
module.exports = mongoose.model('Character', CharacterSchema);