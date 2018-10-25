var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var CategorySchema = new Schema({
    name: {type: String, default: ""}
}, {
    versionKey: false
});

CategorySchema.plugin(autoIncrement.plugin, 'Category');
module.exports  = mongoose.model('Category', CategorySchema);