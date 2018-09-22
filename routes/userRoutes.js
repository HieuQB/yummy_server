var express = require('express');
var router = express.Router();
var User = require('../models/UserModel');
var jwt = require('jsonwebtoken');
var config = require('../config/main');
var passport = require('passport');
const nodemailer = require('nodemailer');
var voucher_codes = require('voucher-code-generator');

function getNextSequenceValue(sequenceName) {
    var sequenceDocument = db.counters.findAndModify(
        {
            query: {_id: sequenceName},
            update: {$inc: {sequence_value: 1}},
            new: true
        });
    return sequenceDocument.sequence_value;
}

router.post('/register', function (req, res) {
    if (!req.body.email || !req.body.password) {
        res.json({success: false, message: 'Please enter email and password.'});
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
        newUser.save(function (err,user) {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                }).status(301);
            }
            res.json({success: true, data:user, message: 'Successfully created new user.'});
        });
    }
});

router.post('/changePass', function (req, res) {
    User.findOne({email: req.body.email}).exec(
        function (err, user) {
            if (err) throw err;
            if (!user) {
                res.send({success: false, message: 'Authentication failed. User not found.', status: 400});
            } else {
                user.password = req.body.password;
                user.save();
                res.send({success: true, data: user, status: 200});
            }
        });
});

router.post('/login', function (req, res) {
    User.findOne({
        email: req.body.email
    }, function (err, user) {
        if (err) throw err;

        if (!user) {
            res.send({success: false, message: 'Authentication failed. User not found.'});
        } else {
            // Check if password matches
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (isMatch && !err) {
                    // Create token if the password matched and no error was thrown
                    var token = jwt.sign(user.toJSON(), config.secret, {
                        expiresIn: 86400000*7 // in 7 days
                    });
                    res.json({success: true, token: 'JWT ' + token, _id: user._id});
                } else {
                    res.send({success: false, message: 'Authentication failed. Passwords did not match.'});
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
            pass: '@14520288Mh'
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
    console.log("aaa")
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
            res.json({
                success: true,
                data: user,
                message: "successful"
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
    User.findOne({_id: req.body._id}).exec(
        function (err, user) {
            if (err) throw err;
            if (!user) {
                res.send({success: false, message: 'Authentication failed. User not found.', status: 400});
            } else {
                if (req.body.gender != null)
                    user.gender = req.body.gender;
                if (req.body.address != null)
                user.address = req.body.address;
                if (req.body.avatar_url != null)
                user.avatar_url = req.body.avatar_url;
                if (req.body.fullName != null)
                user.fullName = req.body.fullName;
                if (req.body.password != null)
                user.password = req.body.password;
                if(req.body.birthDate != null)
                    user.birthDate = req.body.birthDate;
                user.save();
                res.send({success: true, data: user, status: 200});
            }
        });
});

router.post('/loginFacebookGoogle', function (req, res) {
    User.findOne({id_fb_gg: req.body.id_fb_gg}).exec(
        function (err, user) {
            if (err) throw err;
            if (!user) {
                // Tạo một tài khoản mới với email đã cho
                var newUser = new User({
                    email: req.body.email,
                    id_fb_gg : req.body.id_fb_gg,
                    fullName: req.body.fullName,
                    avatar_url: req.body.avatar_url,
                    password: ""
                });

                // Attempt to save the user
                newUser.save(function (err,user) {
                    if (err) {
                        return res.json({success: false, message: err});
                    }else {
                        var token = jwt.sign(user.toJSON(), config.secret, {
                            expiresIn: 86400000*7 // in 7 days
                        });
                        res.json({success: true, token: 'JWT ' + token, _id: user._id});

                    }
                });
            } else {
                // Create token if the password matched and no error was thrown
                var token = jwt.sign(user.toJSON(), config.secret, {
                    expiresIn: 86400000*7 // in 7 days
                });
                res.json({success: true, token: 'JWT ' + token, _id: user._id});
            }
        });
});
// router.post('/updateUser',)

module.exports = router;