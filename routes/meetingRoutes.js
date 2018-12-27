var express = require('express');
var router = express.Router();
var passport = require('passport');
var Notification = require('../models/NotificationModel');
var Meeting = require('../models/MeetingModel');
var Comment = require('../models/CommentModel');
var Post = require('../models/PostModel');
var Rate = require('../models/RateModel');
var WaitingNoti = require('../models/WaitingNotiModel');
var LeavePerson = require('../models/LeavePersonModel');
var RatingAverage = require('../models/RatingAverageModel');

router.post('/check_rating/:meetingId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.find({
        '_id' :req.params.meetingId,
        'is_finished': true
    }).exec((err, meeting) => {
        if (err) {
            return res.json({
                success: false,
                message: err
            }).status(301);
        } else if (!meeting || meeting.length == 0) {
            return res.json({
                success: false,
                message: "meeting not found"
            }).status(404);
        } else {
            if (meeting[0].joined_people.indexOf(req.user._id) > -1) {
                //In the array!
                return res.json({
                    success: true,
                    message: "you can rating this meeting",
                }).status(200);
            } else {
                //Not in the array
                return res.json({
                    success: false,
                    message: "khong duoc rating"
                }).status(200);
            }
        }
    });
});
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
    // console.log(newMeeting);
    Meeting.addJoinPeopleToDatabase(joined_people, (joined_people) => {
        newMeeting.joined_people = joined_people;
        var listRatingAverage = [];
        joined_people.forEach(function (people) {
            var newRatingAverage = new RatingAverage();
            newRatingAverage.user = people;
            listRatingAverage.push(newRatingAverage);
        });
        RatingAverage.create(listRatingAverage, function (err) {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                }).status(301);
            }
            if (!arguments[1])
                return res.json({
                    success: false,
                    message: "can not create meeting"
                }).status(301);
            newMeeting.list_point_average = arguments[1];
            // Attempt to save the user
            newMeeting.save(function (err, meeting) {
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

                                    meeting.joined_people.forEach(function (people) {
                                        if (people._id === meeting.creator._id) {
                                            var content = "Bạn vừa tạo thành công 1 cuộc gặp gỡ";
                                        } else {
                                            var content = meeting.creator.fullName.toString() + " vừa tạo một meeting có mặt bạn!"
                                        }

                                        // Create Notification in Database
                                        var newNoti = new Notification({
                                            user_id: people._id,
                                            // type: 2, // 2 = type Meeting
                                            image: meeting.creator.avatar,
                                            title: content,
                                            content: { type: 2, data: meeting }
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
                        message: "create meeting thành công",
                        data: meeting
                    }).status(200);
                }
            });
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
                newcomment.created_date = Date.now();
                newcomment.modify_date = Date.now();

                newcomment.save(function (err, comment) {
                    if (err) {
                        return res.json({
                            success: false,
                            message: err
                        }).status(301);
                    } else if (comment) {
                        meeting.joined_people.forEach(function (people) {
                            console.log("people: " + people);
                            console.log("craetor: " + comment.creator);
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
                    message: "meeting not found"
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
    console.log(req.user);
    Meeting.find(
        { 'joined_people': { $in: [req.user._id] } }
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
    ).populate("joined_people").populate("comments").populate('list_point_average')
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
                    data: meeting.comments
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

// Xem chi tiết meeting
router.get('/:meetingId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.findById(req.params.meetingId).populate("joined_people").populate("creator").populate('leave_people').populate({
        path: 'comments',
        model: 'Comment',
    })
        .populate({
            path: 'list_point_average',
            model: 'RatingAverage',
            populate: {
                path: 'user',
                model: 'User'
            }
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


router.post('/leave_meeting/:meetingID', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.findById(req.params.meetingID).exec((err, meeting) => {
        if (meeting.joined_people.indexOf(req.user._id) == -1) {
            return res.json({
                success: false,
                data: {},
                message: "bạn không tham gia meeting này!"
            });
        }

        // Dành cho thẳng thoát là trưởng phòng
        if (req.user._id == meeting.creator) {
            meeting.joined_people.every(function (people, index) {
                if (people != meeting.creator) {
                    meeting.creator = people;
                    return true;
                } else {
                    return false;
                }
            });
        }
        // remove khỏi list john people và thêm vào list leave people
        meeting.joined_people.pull(req.user._id);
        var newLeavePerson = new LeavePerson();
        newLeavePerson.user = req.user._id;
        newLeavePerson.type = 0;
        newLeavePerson.reason = req.body.reason;
        newLeavePerson.save((err, leavePerson) => {
            if (leavePerson) {
                meeting.leave_people.push(newLeavePerson);
                meeting.save((err, meeting) => {
                    if (meeting) {
                        return res.json({
                            success: true,
                            data: meeting,
                            message: "thoát khỏi meeting thành công"
                        });
                    }
                });
            } else if (err) {
                return res.json({
                    success: true,
                    data: {},
                    message: err
                });
            }
        });
    });
});

// Kick people khỏi meeting
router.post('/kick_user/:meetingID', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Meeting.findById(req.params.meetingID).exec((err, meeting) => {

        // Dành cho thẳng thoát là trưởng phòng
        if (req.user._id != meeting.creator) {
            return res.json({
                success: false,
                data: {},
                message: "bạn không có quyền kick người này !"
            });
        }

        if (meeting.joined_people.indexOf(req.body.user_id) == -1) {
            return res.json({
                success: false,
                data: {},
                message: "user này không tham gia cuộc hẹn của bạn!"
            });
        }


        // remove khỏi list john people và thêm vào list leave people
        meeting.joined_people.pull(req.body.user_id);
        var newLeavePerson = new LeavePerson();
        newLeavePerson.user = req.body.user_id;
        newLeavePerson.type = 1;
        newLeavePerson.reason = req.body.reason;
        newLeavePerson.save((err, leavePerson) => {
            if (leavePerson) {
                meeting.leave_people.push(newLeavePerson);
                meeting.save((err, meeting) => {
                    if (meeting) {
                        return res.json({
                            success: true,
                            data: meeting,
                            message: "đã kích thành công"
                        });
                    }
                });
            } else if (err) {
                return res.json({
                    success: true,
                    data: {},
                    message: err
                });
            }
        });
    });
});
module.exports = router;