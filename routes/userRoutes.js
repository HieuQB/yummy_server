var express = require('express');
var router = express.Router();
var User = require('../models/UserModel');
var jwt = require('jsonwebtoken');
var config = require('../config/main');
var passport = require('passport');
const nodemailer = require('nodemailer');
var voucher_codes = require('voucher-code-generator');
var Post = require('../models/PostModel');
var router = express.Router();
var Rate = require('../models/RateModel');
var Meeting = require('../models/MeetingModel');
var Request = require('../models/RequestModel');
var Notification = require('../models/NotificationModel');
var WaitingNoti = require('../models/WaitingNotiModel');
var RatingAverage = require('../models/RatingAverageModel');
var geodist = require('geodist');

function getNextSequenceValue(sequenceName) {
    var sequenceDocument = db.counters.findAndModify(
        {
            query: { _id: sequenceName },
            update: { $inc: { sequence_value: 1 } },
            new: true
        });
    return sequenceDocument.sequence_value;
}

router.post('/register', function (req, res) {
    if (!req.body.email || !req.body.password) {
        res.json({ success: false, message: 'Please enter email and password.' });
    } else {
        var newUser = new User({
            email: req.body.email,
            password: req.body.password,
            fullName: req.body.fullName,
            avatar: req.body.avatar,
            address: req.body.address,
            gender: req.body.gender,
            birthday: req.body.birthday,
            phone: req.body.phone,
            latlngAdress: req.body.latlngAdress,
            myCharacter: req.body.myCharacter,
            myStyle: req.body.myStyle,
            targetCharacter: req.body.targetCharacter,
            targetStyle: req.body.targetStyle,
            targetFood: req.body.targetFood
        });

        // Attempt to save the user
        newUser.save(function (err, user) {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                }).status(301);
            }
            // Create token if the password matched and no error was thrown
            var token = jwt.sign(user.toJSON(), config.secret, {
                expiresIn: 604800 // in 7 days
            });

            res.json({ success: true, data: user, token: 'JWT ' + token, expiresIn: Date.now() + 604800 * 1000, message: 'Successfully created new user.' });
        });
    }
});

router.get('/list_user_near', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    console.log(req.user);
    User.aggregate([
        {
            $geoNear: {
                near: req.user.latlngAddress.coordinates,
                distanceField: 'latlngAddress'
            }
        }
    ]).limit(10).sort({ trust_point: -1, main_point: -1 })
        .exec((err, list_user) => {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                }).status(301);
            }
            return res.json({
                success: true,
                message: "Get list thành công",
                data: list_user,
            }).status(200);
        });
});

router.post('/changePass', function (req, res) {
    User.findOne({ email: req.body.email }).exec(
        function (err, user) {
            if (err) throw err;
            if (!user) {
                res.send({ success: false, message: 'Authentication failed. User not found.', status: 400 });
            } else {
                user.password = req.body.password;
                user.save();
                res.send({ success: true, data: user, status: 200 });
            }
        });
});

router.post('/login', function (req, res) {
    User.findOne({
        email: req.body.email
    }, function (err, user) {
        if (err) throw err;

        if (!user) {
            res.send({ success: false, message: 'Authentication failed. User not found.' });
        } else {
            // Check if password matches
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (isMatch && !err) {
                    // Create token if the password matched and no error was thrown
                    var token = jwt.sign(user.toJSON(), config.secret, {
                        expiresIn: 604800 // in 7 days
                    });
                    // global.io.sockets.emit("thongbao-user-"+user.email,{mess : "xin chao"});
                    // global.socket.emit("thongbao-user-hieuit275@gmail.com",{mess : "xin chao"});
                    res.json({ success: true, token: 'JWT ' + token, expiresIn: Date.now() + 604800 * 1000, data: user });
                } else {
                    res.send({ success: false, message: 'Authentication failed. Passwords did not match.' });
                }
            });
        }
    });
});

router.get('/me', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    res.json({
        success: true,
        message: "success",
        data: req.user
    })
});

router.post('/forgotPassword', function (req, res, next) {

    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'netficuit@gmail.com',
            pass: '14520288Mh'
        }
    });

    var codeGenerates = voucher_codes.generate({
        length: 6,
        count: 1,
        charset: "0123456789"
    });

    var data = {
        from: 'NetFicUIT@gmail.com',
        to: req.body.email,
        subject: 'Mã xác nhận Yummy',
        text: `Mã xác nhận của bạn là : ${codeGenerates}`
    };
    transporter.sendMail(data, (err, info) => {
        if (err) {
            res.send({
                success: false,
                message: "Gửi thất bại" + err
            });
        } else {
            res.send({
                success: true,
                message: codeGenerates[0],
            });
        }
    });
});

router.get('/:userId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    User.findById(req.params.userId, (err, user) => {
        if (err)
            res.status(500).send(err);
        else if (user) {
            Meeting.find({ creator: user._id, is_finished: true }).exec((err, meetings) => {
                if (err) throw err;
                user.count_meeting = meetings.length;
                Post.find({ creator: user._id }).exec((err, posts) => {
                    if (err) throw err;
                    user.count_post = posts.length;
                    res.json({
                        success: true,
                        data: user,
                        message: "successful"
                    });
                });
            });
        }
        else {
            res.json({
                success: false,
                data: {},
                message: "user not found"
            });
        }
    });
});

//edit user
router.post('/editUser', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res) {
    User.findById(req.user._id).exec(
        function (err, user) {
            if (err) throw err;
            if (req.body.email)
                delete req.body.email;
            if (req.body.id)
                delete req.body.id;
            for (var p in req.body) {
                user[p] = req.body[p];
            }
            user.save();
            res.send({ success: true, data: user, status: 200 });
        });
});

// Lấy danh sách bài viết của từng user
router.post('/listpostuser', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Post.find(
        { 'creator': { '_id': req.body.user_id } })
        .limit(10).skip(req.body.page * 10)
        .sort({ created_date: -1 })
        .populate('creator')
        .populate("categories")
        .populate("interested_people")
        .exec((err, post) => {
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


// API get danh sách đánh giá profile
router.get('/:userId/list_rating', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Rate.find({ people_evaluate: req.params.userId, type_rating: 2 }).populate('creator').exec((err, rates) => {
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


// check đã rating hay chưa
router.post('/is_had_rating', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    if (req.user._id === req.body.people_evaluate) {
        return res.json({
            success: false,
            data: {},
            message: "error: craetor va people_evaluate bang nhau",
            status: 404
        });
    } else {
        Rate.find({ creator: req.user, type_rating: 2, people_evaluate: req.body.people_evaluate }).exec((err, rating) => {
            if (err) {
                return res.json({
                    success: false,
                    data: {},
                    message: `error is : ${err}`
                });
            }
            if (rating.length > 0) {
                return res.json({
                    success: false,
                    message: "da tung rating cho nguoi nay",
                    status: 404
                });
            } else {
                return res.json({
                    success: true,
                    message: "chưa rating bao giờ",
                    status: 200
                });
            }
        });
    }
});

// API SEARCH
router.post('/search/:page', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    if (req.body.gender != null) {
        User.aggregate([
            {
                $geoNear: {
                    near: [req.body.latitude, req.body.longitude],
                    distanceField: 'latlngAddress'
                }
            },
            {
                $match: {
                    age: { "$gt": req.body.tuoiduoi, "$lt": req.body.tuoitren },
                    gender: req.body.gender
                }
            }
        ])
            .limit(10).skip(req.params.page * 10)
            .sort({ trust_point: -1, main_point: -1 })
            .exec((err, listUserSearch) => {
                if (err) {
                    res.json({
                        success: false,
                        data: {},
                        message: `error is : ${err}`
                    });
                } else {
                    listUserSearch.forEach(item_user => {
                        if (global.socket_list[item_user._id.toString()]) {
                            item_user.isOnline = true;
                        } else {
                            item_user.isOnline = false;
                        }
                    });
                    res.json({
                        success: true,
                        data: listUserSearch,
                        status: 200
                    });
                }
            });
    } else {
        User.aggregate([
            {
                $geoNear: {
                    near: [req.body.latitude, req.body.longitude],
                    distanceField: 'latlngAddress'
                }
            },
            {
                $match: {
                    age: { "$gt": req.body.tuoiduoi, "$lt": req.body.tuoitren }
                }
            }
        ])
            .limit(10).skip(req.params.page * 10)
            .sort({ trust_point: -1, main_point: -1 })
            .exec((err, listUserSearch) => {
                if (err) {
                    res.json({
                        success: false,
                        data: {},
                        message: `error is : ${err}`
                    });
                } else {
                    listUserSearch.forEach(item_user => {
                        if (global.socket_list[item_user._id.toString()]) {
                            item_user.isOnline = true;
                        } else {
                            item_user.isOnline = false;
                        }
                    });
                    res.json({
                        success: true,
                        data: listUserSearch,
                        status: 200
                    });
                }
            });
    }
});

// API gửi noti cho user tìm kiếm được 
router.post('/sendRequest', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    newRequest = new Request();
    newRequest.creator = req.user;
    newRequest.userSearch = req.body.userSearch;
    newRequest.content = req.body.content;
    newRequest.location = req.body.location;
    newRequest.place = req.body.place;
    newRequest.time = req.body.time;

    newRequest.save((err, request) => {
        if (err) {
            res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        } else {
            console.log(request);
            // Create Notification in Database
            var newNoti = new Notification({
                user_id: request.userSearch,
                image: request.creator.avatar,
                title: request.content,
                content: { type: 3, data: request } // 3 là type search 
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
                    global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { invite: noti });
                    return res.json({
                        success: true,
                        message: "gửi noti trực tiếp thành công",
                        data: noti
                    }).status(200);
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
                            return res.json({
                                success: true,
                                message: "Tạo wating thành công do user này offline",
                                data: WaitingNoti
                            }).status(200);
                        }
                    });
                }
            });
        }
    });
});

// API accept request 
router.post('/acceptRequest', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Request.findById(req.body.request).populate('creator').populate('userSearch').exec((err, request) => {
        if (err) {
            return res.json({
                success: false,
                message: err
            }).status(301);
        }
        if (!request) {
            return res.json({
                success: false,
                message: "request not found"
            }).status(301);
        } else {
            console.log(request);
            if (request.userSearch._id == req.user._id) {
                newMeeting = new Meeting();
                var joined_people = [request.creator._id, request.userSearch._id];
                newMeeting.creator = request.creator;
                newMeeting.location = request.location;
                newMeeting.place = request.place;
                newMeeting.time = request.time;

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
                        console.log(newMeeting.list_point_average);
                        // Attempt to save the user
                        newMeeting.save(function (err, meeting) {
                            if (err) {
                                return res.json({
                                    success: false,
                                    message: err
                                }).status(301);
                            } else {
                                // Create Notification in Database
                                var newNoti = new Notification({
                                    user_id: meeting.creator._id,
                                    image: request.userSearch.avatar,
                                    title: request.userSearch.fullName.toString() + " vừa đồng ý lời mời đi ăn của bạn. Ấn Đồng ý để xem chi tiết cuộc hẹn",
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
                                        global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { accept: noti });
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
                                return res.json({
                                    success: true,
                                    message: "create meeting thành công",
                                    data: meeting
                                }).status(200);
                            }
                        });
                    });

                });
            } else {
                return res.json({
                    success: false,
                    message: "bạn không có quyền chấp nhận request này",
                    data: {}
                }).status(404);
            }
        }
    });
});

router.post('/rejectRequest', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Request.findById(req.body.request).populate('creator').populate('userSearch').exec((err, request) => {
        if (err) {
            return res.json({
                success: false,
                message: err
            }).status(301);
        }
        if (!request) {
            return res.json({
                success: false,
                message: "request not found"
            }).status(301);
        } else {
            if (request.userSearch._id == req.user._id) {
                // Create Notification in Database
                var newNoti = new Notification({
                    user_id: request.creator._id,
                    image: request.userSearch.avatar,
                    title: request.userSearch.fullName.toString() + " vừa từ chối lời mời của bạn. Bạn có muốn tìm kiếm người khác không?",
                    content: { type: 3, data: request }
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
                        global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { reject: noti });
                        return res.json({
                            success: true,
                            message: "gửi trực tiếp noti thành công",
                            data: noti
                        }).status(200);
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
                                return res.json({
                                    success: true,
                                    message: "user offline, tạo thành công waiting noti",
                                    data: WaitingNoti
                                }).status(200);
                            }
                        });
                    }
                });
            } else {
                return res.json({
                    success: false,
                    message: "bạn không có quyền chấp nhận request này",
                    data: {}
                }).status(404);
            }
        }
    });
});

module.exports = router;
