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
var Invite = require('../models/InviteModel');
var Notification = require('../models/NotificationModel');
var WaitingNoti = require('../models/WaitingNotiModel');
var RatingAverage = require('../models/RatingAverageModel');
var geodist = require('geodist');
var bcrypt = require('bcrypt');
var GeoPoint = require('geopoint');
var fs = require('fs');

router.post('/register', function (req, res) {
    if (!req.body.email || !req.body.password) {
        res.json({ success: false, message: 'Please enter email and password.' });
    } else {
        // console.log(req.file);
        var newUser = new User({
            email: req.body.email,
            password: req.body.password,
            fullName: req.body.fullName,
            avatar: req.body.avatar,
            address: req.body.address,
            gender: req.body.gender,
            birthday: req.body.birthday,
            phone: req.body.phone,
            latlngAddress: req.body.latlngAddress,
            myCharacter: req.body.myCharacter,
            myStyle: req.body.myStyle,
            targetCharacter: req.body.targetCharacter,
            targetStyle: req.body.targetStyle,
            targetFood: req.body.targetFood
        });
        if (req.body.latlngAddress) {
            newUser.location = [req.body.latlngAddress.coordinates[0], req.body.latlngAddress.coordinates[1]];
        }
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

router.post('/update_pass', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    bcrypt.compare(req.body.password, req.user.password, function (err, isMatch) {
        if (err) {
            return res.json({
                success: false,
                message: err,
                status: 400
            });
        }
        if (!isMatch) {
            return res.json({
                success: false,
                message: "mat khau hien tai khong dung",
                status: 400
            });
        } else if (req.body.newPassWord.length < 6) {
            return res.json({
                success: false,
                message: "mat khau moi phai lon hon 6 ki tu",
                status: 400
            });
        } else {
            req.user.password = req.body.newPassWord;
            req.user.save(function (err, user) {
                if (err) {
                    return res.json({
                        success: false,
                        message: err
                    }).status(404);
                }
                res.json({
                    success: true,
                    message: "doi pass thanh cong",
                    data: user,
                    status: 200
                });
            });
        }
    });
});
router.get('/list_user_near', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    User.aggregate([
        {
            $geoNear: {
                near: [req.user.latlngAddress.coordinates[0], req.user.latlngAddress.coordinates[1]],
                distanceField: 'latlngAddress'
            }
        },
        {
            $match: {
                _id: { $nin: [req.user._id] }
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
            // console.log(list_user);
            list_user.forEach(item_user => {
                point1 = new GeoPoint(req.user.latlngAddress.coordinates[1], req.user.latlngAddress.coordinates[0]);
                point2 = new GeoPoint(item_user.location[1], item_user.location[0]);
                var distance = point1.distanceTo(point2, true); //kilometer
                item_user.distance = distance;
                if (global.socket_list[item_user._id.toString()]) {
                    item_user.isOnline = true;
                } else {
                    item_user.isOnline = false;
                }
            });
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
            if (req.body.avatar) {
                fs.unlink('/opt/yummy/' + user.avatar, (error) => {
                    if (error) {
                        console.error(error);
                    }
                    console.log('Hinh cu da duoc xoa');
                });
            }
            for (var p in req.body) {
                user[p] = req.body[p];
            }
            user.location = [user.latlngAddress.coordinates[0], user.latlngAddress.coordinates[1]];
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
                    gender: req.body.gender,
                    _id: { $nin: [req.user._id] }
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

                        point1 = new GeoPoint(req.user.latlngAddress.coordinates[1], req.user.latlngAddress.coordinates[0]);
                        point2 = new GeoPoint(item_user.location[1], item_user.location[0]);
                        var distance = point1.distanceTo(point2, true); //kilometer
                        item_user.distance = distance;

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
                    age: { "$gt": req.body.tuoiduoi, "$lt": req.body.tuoitren },
                    _id: { $nin: [req.user._id] }
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

                        point1 = new GeoPoint(req.user.latlngAddress.coordinates[1], req.user.latlngAddress.coordinates[0]);
                        point2 = new GeoPoint(item_user.location[1], item_user.location[0]);
                        var distance = point1.distanceTo(point2, true); //kilometer
                        item_user.distance = distance;

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

router.post('/invite', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    var newInvite = new Invite();
    newInvite.creator = req.user;
    newInvite.userSearch = req.body.userSearch;
    if (req.body.meeting) {
        newInvite.meeting = req.body.meeting;
        Meeting.findById(req.body.meeting).exec((err, meeting) => {
            if (err) {
                res.json({
                    success: false,
                    data: {},
                    message: `error is : ${err}`
                });
            } else {
                if (!meeting) {
                    res.json({
                        success: false,
                        data: {},
                        message: "meeting not found"
                    });
                } else {
                    newInvite.content = req.user.fullName.toString() +" muốn mời bạn tham gia cuộc hẹn ở địa điểm " + meeting.place.toString();
                    newInvite.location = meeting.location;
                    newInvite.place = meeting.place; 
                    newInvite.time = meeting.time;
                }
            }
        });
    } else {
        newInvite.content = req.body.content;
        newInvite.location = req.body.location;
        newInvite.place = req.body.place;
        newInvite.time = req.body.time;
    }
    newInvite.save(function (err, invite_data) {
        if (err) {
            res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        } else {
            console.log(invite_data);
            // Create Notification in Database
            var newNoti = new Notification({
                user_id: invite_data.userSearch,
                image: invite_data.creator.avatar,
                title: invite_data.content,
                content: { type: 3, data: invite_data } // 3 là type search 
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
                            // console.log(err);
                        } else {
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
    })
});

// API gửi noti cho user tìm kiếm được 
router.post('/acceptInvite', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Invite.findById(req.body.request).populate('creator').populate('userSearch').exec((err, invite) => {
        if (err) {
            res.json({
                success: false,
                message: err
            }).status(301);
        } else if (!invite) {
            res.json({
                success: false,
                message: "Invite not found"
            }).status(404);
        } else {
            if (invite.meeting == 0) {
                const newMeeting = new Meeting();
                var joined_people = [];
                joined_people = [invite.creator._id, invite.userSearch._id];
                newMeeting.creator = invite.creator;
                newMeeting.location = invite.location;
                newMeeting.place = invite.place;
                newMeeting.time = invite.time;
                if (invite.userSearch._id == req.user._id) {
                    Meeting.addJoinPeopleToDatabase(joined_people, (joined_people) => {
                        newMeeting.joined_people = joined_people;
                        var listRatingAverage = [];
                        joined_people.forEach(function (people) {
                            var newRatingAverage = new RatingAverage();
                            newRatingAverage.user = people;
                            listRatingAverage.push(newRatingAverage);
                        });
                        // console.log(listRatingAverage);
                        RatingAverage.create(listRatingAverage, function (err) {
                            if (err) {
                                return res.json({
                                    success: false,
                                    message: err
                                }).status(301);
                            }
                            // console.log(arguments);
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
                                    // Create Notification in Database
                                    var newNoti = new Notification({
                                        user_id: meeting.creator._id,
                                        image: invite.userSearch.avatar,
                                        title: invite.userSearch.fullName.toString() + " vừa đồng ý lời mời đi ăn của bạn. Ấn Đồng ý để xem chi tiết cuộc hẹn",
                                        content: { type: 2, data: meeting }
                                    });
                                    // Attempt to save the user
                                    newNoti.save(function (err, noti) {
                                        if (err) {
                                            res.json({
                                                success: false,
                                                message: err
                                            }).status(301);
                                        } else if (global.socket_list[noti.user_id.toString()] != null) {
                                            global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { accept: noti });
                                            res.json({
                                                success: true,
                                                message: "create meeting thành công",
                                                data: meeting
                                            }).status(200);
                                        } else {
                                            console.log("socket null");
                                            newWaiting = new WaitingNoti({
                                                userID: noti.user_id,
                                                dataNoti: noti
                                            });

                                            newWaiting.save(function (err, WaitingNoti) {
                                                if (err) {
                                                    // console.log(err);
                                                    res.json({
                                                        success: false,
                                                        message: err
                                                    }).status(301);
                                                } else {
                                                    console.log("THÊM waiting Noti: " + WaitingNoti);
                                                    res.json({
                                                        success: true,
                                                        message: "create meeting thành công",
                                                        data: meeting
                                                    }).status(200);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    })
                } else {
                    res.json({
                        success: false,
                        message: "bạn không có quyền chấp nhận request này",
                        data: {}
                    }).status(404);

                }
            } else {
                Meeting.findById(invite.meeting).exec((err, meeting) => {
                    if (err) {
                        return res.json({
                            success: false,
                            data: {},
                            message: err
                        });
                    }
                    if (!meeting) {
                        return res.json({
                            success: false,
                            data: {},
                            message: 'Meeting not found'
                        });
                    } else {
                        meeting.joined_people.push(invite.userSearch);
                        meeting.save((err, meeting) => {
                            if (err) {
                                return res.json({
                                    success: false,
                                    data: {},
                                    message: err
                                });
                            }
                            return res.json({
                                success: true,
                                data: meeting,
                                message: 'Thêm người thành công'
                            });
                        });

                        // Create Notification in Database
                        var newNoti = new Notification({
                            user_id: meeting.creator._id,
                            // type: 2, // 2 = type Meeting
                            image: meeting.creator.avatar,
                            title: "Có người vừa đồng ý lời mời đi ăn của bạn. Ấn Đồng ý để xem chi tiết cuộc hẹn",
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
                    }
                });
            }
        }
    });
});

router.post('/rejectRequest', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Invite.findById(req.body.request).populate('creator').populate('userSearch').exec((err, request) => {
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
                                return res.json({
                                    success: false,
                                    message: err
                                }).status(301);
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
