var express = require('express');
var router = express.Router();
var passport = require('passport');
var Notification = require('../models/NotificationModel');
var Meeting = require('../models/MeetingModel');
var Comment = require('../models/CommentModel');
var Post = require('../models/PostModel');
var Rate = require('../models/RateModel');
var WaitingNoti = require('../models/WaitingNotiModel');

//  Tạo cuộc hẹn mới
router.post('/create_meeting', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    // if (req.user.user_id == )
    const newMeeting = new Meeting();
    var joined_people = req.body.joined_people;
    newMeeting.post_id = req.body.postId;
    newMeeting.creator = req.user;

    Post.findById(req.body.postId).exec((err, post) => {
        if (err) {
            return res.json({
                success: false,
                message: err
            }).status(301);
        } else if (!post) {
            return res.json({
                success: false,
                message: "Post not found"
            }).status(404);
        } else {
            newMeeting.location = post.location;
            newMeeting.place = post.place;
            newMeeting.time = post.time;
        }
    });

    Meeting.addJoinPeopleToDatabase(joined_people, (joined_people) => {
        newMeeting.joined_people = joined_people;
        // Attempt to save the user
        newMeeting.save(function (err, metting) {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                }).status(301);
            } else {

                // Disable bài post
                Post.findById(req.body.postId).exec((err, post) => {
                    if (err)
                        res.json({
                            success: false,
                            message: `Error: ${err}`
                        });
                    else if (post) {
                        post.is_active = false;
                        post.save(function (err, post) {
                            if (!err) {
                                metting.joined_people.forEach(function (people) {
                                    if (people._id === metting.creator._id) {
                                        var content = "Bạn vừa tạo thành công 1 cuộc gặp gỡ";
                                    } else {
                                        var content = metting.creator.fullName.toString() + " vừa tạo một meeting có mặt bạn!"
                                    }

                                    // Create Notification in Database
                                    var newNoti = new Notification({
                                        user_id: people._id,
                                        // type: 2, // 2 = type Meeting
                                        image: metting.creator.avatar,
                                        title: content,
                                        content: { type: 2, data: metting }
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
                                });
                            }
                        });
                    }
                    else {
                        return res.json({
                            success: false,
                            message: err
                        }).status(301);
                    }
                });

                return res.json({
                    success: true,
                    message: "create metting thành công",
                    data: metting
                }).status(200);
            }
        });
    });
});


//  Thêm comment cho cuộc hẹn
router.post('/:meetingId/add_comment', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.findById(req.params.meetingId)
        .exec((err, meeting) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else if (meeting) {
                const newcomment = new Comment({
                    creator: req.user,
                    content: req.body.content
                });

                newcomment.save(function (err, comment) {
                    if (err) {
                        return res.json({
                            success: false,
                            message: err
                        }).status(301);
                    } else if (comment) {
                        meeting.joined_people.forEach(function (people) {
                            console.log("people: "+people);
                            console.log("craetor: "+comment.creator);
                            if (people != comment.creator._id) {
                                // Create Notification in Database
                                var newNoti = new Notification({
                                    user_id: people,
                                    // type: 2, // 2 = type Meeting
                                    image: comment.creator.avatar,
                                    title: comment.creator.fullName.toString() + " vừa bình luận meeting có mặt bạn!",
                                    content: { type: 2, data: comment }
                                });

                                // Attempt to save the user
                                newNoti.save(function (err, noti) {
                                    if (err) {
                                        return res.json({
                                            success: false,
                                            message: err
                                        }).status(301);
                                    }
                                    // if (global.socket != null) {
                                    //     global.socket.emit("notify-user-" + noti.user_id.toString(), { nomal: noti });
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
                        });

                        meeting.comments.push(comment);
                        meeting.save(function (err, meeting) {
                            if (!err) {
                                return res.json({
                                    success: true,
                                    message: "Tạo mới comment cho meeting"
                                });
                            }
                        });

                    }
                });

            }
            else {
                res.json({
                    success: false,
                    data: {},
                    message: "metting not found"
                });
            }
        });
});

// Lấy danh sách meeting cho user 
router.get('/list/:page', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    var page = req.params.page;
    Meeting.find(
        { 'joined_people': { $in: [req.user] } }
    ).populate("joined_people").populate("comments")
        .limit(10).skip(page * 10)
        .exec((err, meeting) => {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: meeting,
                    message: "success"
                });
            }
        });

});

// Lấy danh sách meeting cho user tùy theo trạng thái
router.post('/list_status', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.find(
        { 'joined_people': { $in: [req.user] }, is_finished: req.body.status }
    ).populate("joined_people").populate("comments")
        .exec((err, meeting) => {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: meeting,
                    message: "success"
                });
            }
        });
});

// Lấy danh sách meeting cho user bất kì tùy theo trạng thái
router.post('/:userId/list_status', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.find(
        { 'joined_people': { $in: [req.params.userId] }, is_finished: req.body.status }
    ).populate("joined_people").populate("comments")
        .exec((err, meeting) => {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                global.meeting_list = new Array();
                meeting.forEach(function (item_meeting) {

                    Rate.find({
                        meeting: item_meeting._id,
                        type_rating: 1,
                        people_evaluate: req.params.userId
                    })
                        .exec((err, rating) => {
                            if (err) {
                                console.log(err);
                            }
                            if (!rating) {
                                console.log("rating not found");
                            } else {
                                var point_average = 0;
                                // console.log(rating);
                                rating.forEach(function (item_rating) {
                                    point_average += item_rating.point;
                                });
                                item_meeting.point_average = point_average / rating.length;
                                console.log(item_meeting.point_average);
                                global.meeting_list.push(item_meeting);
                                // console.log(rating);
                            }
                        });

                });
                res.json({
                    success: true,
                    data: global.meeting_list,
                    message: "success"
                });
            }
        });
});

// Lấy danh sách bình luận của meeting
router.get('/:meetingId/list_comment', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.findById(req.params.meetingId).populate("creator").populate({
        path: 'comments',
        model: 'Comment',
        populate: {
            path: 'creator',
            model: 'User'
        }
    })
        .exec((err, metting) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else if (metting) {
                res.json({
                    success: true,
                    message: "Thành công",
                    data: metting.comments
                });
            }
            else {
                res.json({
                    success: false,
                    message: "metting not found"
                });
            }
        });
});

// Xem chi tiết meeting
router.get('/:meetingId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.findById(req.params.meetingId).populate("joined_people").populate("creator").populate({
        path: 'comments',
        model: 'Comment',
    })
        .exec((err, meeting) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else if (meeting) {
                res.json({
                    success: true,
                    message: "Thành công",
                    data: meeting
                });
            }
            else {
                res.json({
                    success: false,
                    message: "meeting not found"
                });
            }
        });
});

// API get list rating của meeting
router.get('/:meetingID/list_rating/:userId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Rate.find({ meeting: req.params.meetingID, type_rating: 1, people_evaluate: req.params.userId }).populate('creator').exec((err, rates) => {
        if (err)
            res.status(500).send(err);
        else if (rates) {
            res.json({
                success: true,
                data: rates,
                message: "successful"
            });
        }
        else {
            res.json({
                success: false,
                data: {},
                message: "rates not found"
            });
        }
    });
});


// Sửa comment trong meeting 
router.put('/update_comment/:commentID', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Comment.findById(req.params.commentID).populate('creator').exec((err, comment) => {
        if (err)
            res.status(500).send(err);
        else if (comment) {
            if (req.body._id)
                delete req.body._id;
            if (req.body.id)
                delete req.body.id;
            // user is not creator
            if (req.user._id === comment.creator._id) {
                for (var p in req.body) {
                    comment[p] = req.body[p];
                }
                comment.modify_date = Date.now();

                comment.save((err) => {
                    if (err)
                        res.json({
                            success: false,
                            message: `Error: ${err}`
                        });
                    else
                        res.json({
                            success: true,
                            message: "update comment success",
                            data: comment
                        });
                });
            } else {
                res.json({
                    success: false,
                    message: "You don't have permission"
                })
            }
        }
        else {
            res.json({
                success: false,
                data: {},
                message: "comment not found"
            });
        }
    });
});

router.delete('/comment/:commentID', passport.authenticate('jwt', { session: false, failureRedirect: '/unauthorized' }), (req, res, next) => {
    Comment.findById(req.params.commentID).populate('creator').exec((err, comment) => {
        if (err)
            res.status(500).send(err);
        else if (comment) {
            if (req.user._id === comment.creator._id) {
                comment.remove((err) => {
                    if (err)
                        res.json({
                            success: false,
                            message: `Error: ${err}`
                        });
                    else {
                        res.json({
                            success: true,
                            message: "delete comment success"
                        });
                    }
                });
            } else {
                res.json({
                    success: false,
                    message: "You don't have permission"
                })
            }

        } else {
            res.json({
                success: false,
                data: {},
                message: "comment not found"
            });
        }
    });
});

module.exports = router;