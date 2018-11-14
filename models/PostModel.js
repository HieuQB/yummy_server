var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');
var Category = require('../models/CategoryModel');

var PostSchema = new Schema({
    creator: {type: Number, ref: 'User'},
    amount: {type: Number},
    link: {type: String},
    image: {type: String,default: ""},
    interested_people: [{type: Number, ref: 'User'}],
    categories: [{type: Number, ref: 'Category'}],
    is_active: {type: Boolean, default: true},
    content: {type: String},
    location: {coordinates: {type: [Number], index: '2d', spherical: true}},
    place: {type: String},
    comments: [{type: Number, ref: 'Comment'}],
    time: {type: Date,default: Date.now()},
    created_date: {type: Date, default: Date.now()},
    modified_date: {type: Date, default: Date.now()},
    is_noti: {type: Boolean, default:false}
}, {
    usePushEach: true,
    versionKey: false
});

PostSchema.plugin(autoIncrement.plugin, 'Post');


function addCategoryToDatabase(categories, callback) {
    var data = [];
    if(categories == null || categories.length === 0)
        return callback(data);

    var count = categories.length;
    categories.forEach((_id) => {
        var category = Category.findById(_id).exec((err, category) => {
            if (err) {
                res.json({
                    success: false,
                    data: {},
                    message: `error is : ${err}`
                });
            }
            data.push(category);
            count--;
            if(count === 0) {
                callback(data);
            }
        });

    });
}

module.exports = mongoose.model('Post', PostSchema);
module.exports.addCategoryToDatabase = addCategoryToDatabase;