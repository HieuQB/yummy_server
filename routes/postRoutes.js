var express = require('express');
var router = express.Router();
var Post = require('../models/PostModel');
var User = require('../models/UserModel');
var Category = require('../models/CategoryModel');
var passport = require('passport');
var geodist = require('geodist');

router.post('/', passport.authenticate('jwt', {session: false, failureRedirect: '/unauthorized'}), function (req, res, next) {
    var categories = req.body.categories;
    delete req.body.categories;
    const newPost = new Post(req.body);
    newPost.creator = req.user;
    Post.addCategoryToDatabase(categories, (categories)=>{
        newPost.categories = categories;
        newPost.save((err) => {
            if(err) {
                res.status(402);
                res.json({
                    success: false,
                    message: `Error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: newPost,
                    message: 'Success upload new post'
                })
            }
        })
    });
});

router.use('/:postId', passport.authenticate('jwt', {session: false, failureRedirect: '/unauthorized'}), function(req, res, next) {
    Post.findById(req.params.postId).populate('creator').populate('categories').populate('interested_people')
        .populate({
            path: 'comments',
            model: 'Comment',
            populate: {
                path: 'creator',
                model: 'User'
            }
        })
        .exec((err, post) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else if (post) {
                req.post = post;
                next();
            }
            else {
                res.json({
                    success: false,
                    data: {},
                    message: "post not found"
                });
            }
        });
});

router.get('/:postId', function (req, res, next) {
    res.json({
        success: true,
        data: req.post,
        message: "success"
    });
});

router.use('/:postId/interested', passport.authenticate('jwt', {session: false, failureRedirect: '/unauthorized'}), function(req, res, next) {
   Post.findById(req.params.postId).populate('interested_people').exec((error, post) => {
       if(error) {
           res.json({
               success: false,
               message: `Error: ${err}`
           });
       }
       if(post) {
           req.post = post;
           next()
       } else {
           res.json(404);
           res.json({
               success: false,
               message: "Not found"
           })
       }
   })
});

router.post('/:postId/interested', function (req, res, next) {
    var interestedUser = null;
    req.post.interested_people.forEach((person) => {
        if(person.id === req.user.id){
            interestedUser = person
        }
    });
    if(interestedUser) {
        req.post.interested_people.pull(interestedUser)
    } else{
        req.post.interested_people.push(req.user)
    }
    req.post.save((error) => {
        if(error) {
            res.status(500);
            res.json({
                success: false,
                message: `Error ${error}`
            })
        } else {
            res.json({
                success: true,
                message: 'Success',
                data: req.post
            })
        }
    })
});

router.post('/listUserPost', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Post.find({creator: req.body.creator}).populate("creator").populate("category").populate("reaction").exec((err, post) => {
        if (err) {
            res.json({
                success: false,
                data: [],
                message: `Error is : ${err}`
            });
        } else {
            res.json({
                success: true,
                data: post,
                message: "success"
            });
        }
    });

});

router.post('/filter', function (req, res, next) {
    if(req.body.category.length === 0) {
        Post.find().populate('creator').populate("category").populate("reaction").limit(100).sort({created_date: -1}).exec((err, posts) => {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: posts,
                    message: "success"
                });
            }
        });
    } else {
        Post.find({'category': {$in: req.body.category}, 'level': {$in: req.body.level}}).populate('creator').populate("category").populate("reaction").limit(100).sort({name: 1}).exec((err, posts) => {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: posts,
                    message: "success"
                });
            }
        });
    }
});

router.get('/', passport.authenticate('jwt', {session: false, failureRedirect: '/unauthorized'}), function (req, res, next) {
    var page = req.params.page;
    Post.find({'is_active': true})
        .limit(10).skip(page * 10)
        .sort({created_date: -1})
        .populate('creator')
        .populate("categories")
        .exec((err, posts) => {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: posts,
                    message: "success"
                });
            }
        });
});


router.post('/nearme', function (req, res, next) {
    Post.aggregate([
        {$geoNear: {
            near: [req.body.latitude, req.body.longitude],
            distanceField: 'location'
        }}
    ])
        .limit(10).skip(10*req.params.page)
        .exec(function (err, posts) {
        if (err) {
            res.json({
                success: false,
                data: [],
                message: `Error is : ${err}`
            });
        } else {
            Post.populate(posts, [{path: 'creator'}, {path: 'category'}, {path: 'reaction'}], function (err, results) {
                if (err) {
                    res.json({
                        success: false,
                        data: [],
                        message: `Error is : ${err}`
                    });
                } else {
                    res.json({
                        success: true,
                        data: results,
                        message: "success"
                    });
                }
            })
        }
    });
});

router.post('/list_main', function (req, res, next) {
    Post.aggregate([
        {$geoNear: {
                near: [req.body.latitude, req.body.longitude],
                distanceField: 'location'
            }}
    ]).exec(function (err, posts) {
        if (err) {
            res.json({
                success: false,
                data: [],
                message: `Error is : ${err}`
            });
        } else {
            Post.populate(posts, [{path: 'creator'}, {path: 'category'}, {path: 'reaction'}], function (err, results) {
                if (err) {
                    res.json({
                        success: false,
                        data: [],
                        message: `Error is : ${err}`
                    });
                } else {
                    const parseJsonAsync = (jsonString) => {
                        return new Promise(resolve => {
                            setTimeout(() => {
                                resolve(JSON.parse(jsonString))
                            })
                        })
                    };
                    parseJsonAsync(results).then(jsonData => {
                        for(let items of jsonData['craetor']) {
                            // Lấy ra các trường của Creator trong jsonData
                            // rồi lấy thêm thông tin của user đăng nhập (request)
                            // rồi dùng công thức để tính
                            console.log(items);
                        }

                    });

                    res.json({
                        success: true,
                        data: results,
                        message: "success"
                    });

                }
            })
        }
    });
});

router.post('/nearme/filter', function (req, res, next) {
    if(req.body.category.length === 0) {
        Post.aggregate([
            {$geoNear: {
                    near: [req.body.latitude, req.body.longitude],
                    distanceField: 'location'
                }}
        ]).exec(function (err, posts) {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                Post.populate(posts, [{path: 'creator'}, {path: 'category'}, {path: 'reaction'}], function (err, results) {
                    if (err) {
                        res.json({
                            success: false,
                            data: [],
                            message: `Error is : ${err}`
                        });
                    } else {
                        res.json({
                            success: true,
                            data: results,
                            message: "success"
                        });
                    }
                })
            }
        });
    } else {
        Post.aggregate([
            {$geoNear: {
                    near: [req.body.latitude, req.body.longitude],
                    distanceField: 'location'}},
            {$match: {'category': {$in : req.body.category}, 'level': {$in: req.body.level}}}
        ]).exec(function (err, posts) {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                Post.populate(posts, [{path: 'creator'}, {path: 'category'}, {path: 'reaction'}], function (err, results) {
                    if (err) {
                        res.json({
                            success: false,
                            data: [],
                            message: `Error is : ${err}`
                        });
                    } else {
                        res.json({
                            success: true,
                            data: results,
                            message: "success"
                        });
                    }
                })
            }
        });
    }
});

router.put('/:postId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    //user is not creator
    if (req.user.id.localeCompare(req.post.creator._id) === 0) {
        for (var p in req.body) {
            req.post[p] = req.body[p];
        }
        req.post.modify_date = Date.now();

        req.post.save((err) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else
                res.json({
                    success: true,
                    message: "update post success",
                    data: req.post
                });
        });
    } else {
        res.json({
            success: false,
            message: "You don't have permission"
        })
    }
});

// router.delete('/:postId', passport.authenticate('jwt', {
//     session: false,
//     failureRedirect: '/unauthorized'
// }), function (req, res, next) {
//     if (req.user.id.localeCompare(req.post.creator._id) === 0) {
//         req.post.remove((err) => {
//             if (err)
//                 res.json({
//                     success: false,
//                     message: `Error: ${err}`
//                 });
//             else
//                 res.json({
//                     success: true,
//                     message: "delete post success"
//                 });
//         });
//     } else {
//         res.json({
//             success: false,
//             message: "You don't have permission"
//         })
//     }
// });

module.exports = router;
