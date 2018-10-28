var express = require('express');
var router = express.Router();
var passport = require('passport');
var Notification = require('../models/NotificationModel');
var Meeting = require('../models/MeetingModel');
var Comment = require('../models/CommentModel');
var Post = require('../models/PostModel');

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
                                        content: {type:2, data: metting}
                                    });
                                    // Attempt to save the user
                                    newNoti.save(function (err, noti) {
                                        if (err) {
                                            return res.json({
                                                success: false,
                                                message: err
                                            }).status(301);
                                        }
                                        if (global.socket != null) {
                                            global.socket.emit("notify-user-" + noti.user_id.toString(), { data_noti: noti });
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
                            if (people != comment.creator._id) {
                                // Create Notification in Database
                                var newNoti = new Notification({
                                    user_id: people,
                                    // type: 2, // 2 = type Meeting
                                    image: comment.creator.avatar,
                                    title: comment.creator.fullName.toString() + " vừa bình luận meeting có mặt bạn!",
                                    content: {type: 2, data: comment}
                                });

                                // Attempt to save the user
                                newNoti.save(function (err, noti) {
                                    if (err) {
                                        return res.json({
                                            success: false,
                                            message: err
                                        }).status(301);
                                    }
                                    if (global.socket != null) {
                                        global.socket.emit("notify-user-" + noti.user_id.toString(), { data_noti: noti });
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
router.get('/', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.find(
        { 'joined_people': { $in: [req.user] } }
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
    Meeting.findById(req.params.meetingId).populate("joined_people").populate("creator")
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
                    data: metting
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

module.exports = router;