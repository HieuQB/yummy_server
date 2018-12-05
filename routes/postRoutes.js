var express = require('express');
var router = express.Router();
var Post = require('../models/PostModel');
var User = require('../models/UserModel');
var Category = require('../models/CategoryModel');
var passport = require('passport');
var geodist = require('geodist');
var Notification = require('../models/NotificationModel');
var Meeting = require('../models/MeetingModel');
var Comment = require('../models/CommentModel');
var WaitingNoti = require('../models/WaitingNotiModel');

router.post('/', passport.authenticate('jwt', { session: false, failureRedirect: '/unauthorized' }), function (req, res, next) {
    var categories = req.body.categories;
    delete req.body.categories;
    const newPost = new Post(req.body);
    newPost.creator = req.user;
    Post.addCategoryToDatabase(categories, (categories) => {
        newPost.categories = categories;
        newPost.save((err) => {
            if (err) {
                res.status(402);
                res.json({
                    success: false,
                    message: `Error is : ${err}`
                });
            } else {
                User.aggregate([
                    {
                        $geoNear: {
                            near: newPost.location,
                            distanceField: 'latlngAddress'
                        },
                        'myFavorite': { $in: [newPost.categories] }
                    }
                ]).limit(10)
                    .exec((err, list_user) => {
                        if (err) {
                            console.log(err);
                        } else if (list_user.length > 0) {
                            // NOti tới thông tin bài viết
                            list_user.forEach((user) => {
                                // Create Notification in Database
                                var newNoti = new Notification({
                                    user_id: user,
                                    title:  newPost.creator.fullName.toString() + " vừa đăng một bài viết ở gần bạn: "+ newPost.content,
                                    image: newPost.creator.avatar,
                                    content: { type: 1, data: newPost } // 1 = type Post
                                });

                                // Attempt to save the user
                                newNoti.save(function (err, noti) {
                                    if (err) {
                                        return res.json({
                                            success: false,
                                            message: err
                                        }).status(301);
                                    }
                                    if (global.socket_list[noti.user_id.toString()] != null) {
                                        // console.log("goi emit notify-user-" + noti.user_id.toString());
                                        global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { nomal: noti });
                                    } else {
                                        console.log("socket null");
                                        newWaiting = new WaitingNoti({
                                            userID: noti.user_id,
                                            dataNoti: noti
                                        });

                                        newWaiting.save(function (err, WaitingNoti) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log("THÊM waiting Noti: " + WaitingNoti);
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    });
                res.json({
                    success: true,
                    data: newPost,
                    message: 'Success upload new post'
                })
            }
        })
    });
});

router.use('/:postId', passport.authenticate('jwt', { session: false, failureRedirect: '/unauthorized' }), function (req, res, next) {
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

router.post('/:postId/interested', passport.authenticate('jwt', { session: false, failureRedirect: '/unauthorized' }), function (req, res, next) {
    var interestedUser = null;
    req.post.interested_people.forEach((person) => {
        if (person.id === req.user.id) {
            interestedUser = person
        }
    });
    if (interestedUser) {
        req.post.interested_people.pull(interestedUser);
        // Create Notification in Database
        var newNoti = new Notification({
            user_id: req.post.creator.id,
            title: interestedUser.fullName.toString() + " không còn quan tâm bài post của bạn nữa",
            image: interestedUser.avatar,
            content: { type: 1, data: req.post } // 1 = type Post
        });

        // Attempt to save the user
        newNoti.save(function (err, noti) {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                }).status(301);
            }
            // if (global.socket_list[req.post.creator.id.toString()] != null) {
            //     console.log("goi emit notify-user-" + req.post.creator.id.toString());
            //     global.socket_list[req.post.creator.id.toString()].emit("notify-user-" + req.post.creator.id.toString(), { nomal: noti });
            // } else {
            //     console.log("socket null");
            // }
            if (global.socket_list[noti.user_id.toString()] != null) {
                console.log("goi emit notify-user-" + noti.user_id.toString());
                global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { nomal: noti });
            } else {
                console.log("socket null");
                newWaiting = new WaitingNoti({
                    userID: noti.user_id,
                    dataNoti: noti
                });

                newWaiting.save(function (err, WaitingNoti) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("THÊM waiting Noti: " + WaitingNoti);
                    }
                });
            }
        });
    } else {
        req.post.interested_people.push(req.user);
        // Create Notification in Database
        var newNoti = new Notification({
            user_id: req.post.creator.id,
            // type: 1, // 1 = type Post
            title: req.user.fullName.toString() + " vừa quan tâm bài post của bạn",
            image: req.user.avatar,
            content: { type: 1, data: req.post }
        });

        // Attempt to save the user
        newNoti.save(function (err, noti) {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                }).status(301);
            }
            // if (global.socket_list[req.post.creator.id.toString()] != null) {
            //     console.log("goi emit notify-user-" + req.post.creator.id.toString());
            //     global.socket_list[req.post.creator.id.toString()].emit("notify-user-" + req.post.creator.id.toString(), { nomal: noti });
            // } else {
            //     console.log("socket null");
            // }
            if (global.socket_list[noti.user_id.toString()] != null) {
                console.log("goi emit notify-user-" + noti.user_id.toString());
                global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { nomal: noti });
            } else {
                console.log("socket null");
                newWaiting = new WaitingNoti({
                    userID: noti.user_id,
                    dataNoti: noti
                });

                newWaiting.save(function (err, WaitingNoti) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("THÊM waiting Noti: " + WaitingNoti);
                    }
                });
            }
        });
    }
    req.post.save((err) => {
        if (err) {
            res.status(500);
            res.json({
                success: false,
                message: `Error ${err}`
            })
        } else {

            res.json({
                success: true,
                message: 'Success',
                data: req.post
            });
        }
    })
});

// Get list bài viết active mà theo status quan tâm hoặc chưa quan tâm
router.post('/:page/list', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    var page = req.params.page;
    console.log(req.body.flag);
    if (req.body.flag == true) {
        Post.find({
            // Điều kiện lọc
            'is_active': true,
            'interested_people': { $in: [req.user] }
        })
            .limit(10).skip(page * 10)
            .sort({ created_date: -1 })
            .populate('creator')
            .populate("categories")
            .populate("interested_people")
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
    } else {
        Post.find({
            // Điều kiện lọc
            'is_active': true,
            'interested_people': { $nin: [req.user] }
        })
            .limit(10).skip(page * 10)
            .sort({ created_date: -1 })
            .populate('creator')
            .populate("categories")
            .populate("interested_people")
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
    }
});

router.get('/', passport.authenticate('jwt', { session: false, failureRedirect: '/unauthorized' }), function (req, res, next) {
    var page = req.params.page;
    Post.find({ 'is_active': true })
        .limit(10).skip(page * 10)
        .sort({ created_date: -1 })
        .populate('creator')
        .populate("categories")
        .populate("interested_people")
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
        {
            $geoNear: {
                near: [req.body.latitude, req.body.longitude],
                distanceField: 'location'
            }
        }
    ])
        .limit(10).skip(10 * req.params("page"))
        .exec(function (err, posts) {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                Post.populate(posts, [{ path: 'creator' }, { path: 'category' }, { path: 'reaction' }], function (err, results) {
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
        {
            $geoNear: {
                near: [req.body.latitude, req.body.longitude],
                distanceField: 'location'
            }
        }
    ]).exec(function (err, posts) {
        if (err) {
            res.json({
                success: false,
                data: [],
                message: `Error is : ${err}`
            });
        } else {
            Post.populate(posts, [{ path: 'creator' }, { path: 'category' }, { path: 'reaction' }], function (err, results) {
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
                        for (let items of jsonData['craetor']) {
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
    if (req.body.category.length === 0) {
        Post.aggregate([
            {
                $geoNear: {
                    near: [req.body.latitude, req.body.longitude],
                    distanceField: 'location'
                }
            }
        ]).exec(function (err, posts) {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                Post.populate(posts, [{ path: 'creator' }, { path: 'category' }, { path: 'reaction' }], function (err, results) {
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
            {
                $geoNear: {
                    near: [req.body.latitude, req.body.longitude],
                    distanceField: 'location'
                }
            },
            { $match: { 'category': { $in: req.body.category }, 'level': { $in: req.body.level } } }
        ]).exec(function (err, posts) {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                Post.populate(posts, [{ path: 'creator' }, { path: 'category' }, { path: 'reaction' }], function (err, results) {
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
    //user is not creator?
    if (req.user.id === req.post.creator.id) {
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



router.delete('/:postId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res) {
    if (req.user.id === req.post.creator.id) {
        req.post.remove((err) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else
                res.json({
                    success: true,
                    message: "delete post success"
                });
        });
    } else {
        res.json({
            success: false,
            message: "You don't have permission"
        })
    }
});

// Danh sách người quan tâm bài post
router.get('/:postId/interested_list', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res) {
    Post.findById(req.params.postId).populate('interested_people')
        .exec((err, post) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else if (post) {
                res.json({
                    success: true,
                    data: post.interested_people,
                    message: "sucssess"
                });
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

module.exports = router;
