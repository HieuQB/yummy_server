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
    console.log(req.body.latitude);c
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
            .sort({ trust_point: -1 ,main_point:-1})
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
        ]).exec((err, listUserSearch) => {
            if (err) {
                res.json({
                    success: false,
                    data: {},
                    message: `error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: listUserSearch,
                    status: 200
                });
            }
        });
    }

});



module.exports = router;
