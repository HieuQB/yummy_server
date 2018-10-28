var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var NotiDataSchema = new Schema({
    type: {type: Number},
    data: {type: Object}
}, {
    versionKey: false
});

CategorySchema.plugin(autoIncrement.plugin, 'NotiData');
module.exports  = mongoose.model('NotiData', CategorySchema);