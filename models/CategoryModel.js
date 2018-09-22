var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var CategorySchema = new Schema({
    name: {type: String, default: ""}
}, {
    versionKey: false
});

CategorySchema.plugin(autoIncrement.plugin, {model: 'Category', startAt:1});
module.exports  = mongoose.model('Category', CategorySchema);