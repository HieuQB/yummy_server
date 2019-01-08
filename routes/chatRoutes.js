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
var Chat = require('../models/ChatModel');
var ListChat = require('../models/ListChatModel');
var RatingAverage = require('../models/RatingAverageModel');
var geodist = require('geodist');
var bcrypt = require('bcrypt');
var GeoPoint = require('geopoint');

router.post('/create_new_chat', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    newChat = new Chat();
    newChat.from = req.user._id;
    newChat.to = req.body.to;
    newChat.date = Date.now();
    newChat.message = req.body.message;
    newChat.users = [newChat.from, newChat.to];
    newChat.save((err, newChat) => {
        if (err) {
            res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        }
        else {
            ListChat.find({
                'users': { $in: [req.user._id] }
            })
                .populate('lastMessage')
                .exec((err, list_chat) => {
                    if (err) {
                        res.json({
                            success: false,
                            data: {},
                            message: `error is : ${err}`
                        });
                    } else {
                        var chat = null;
                        list_chat.forEach(element => {
                            if (element.users.indexOf(newChat.to) > -1 && element.users.indexOf(newChat.from) > -1) {
                                chat = element;
                            }
                        });

                        if (chat) {
                            chat.lastMessage = newChat;
                            chat.lastDate = newChat.date;
                        } else {
                            chat = new ListChat();
                            chat.lastMessage = newChat;
                            chat.lastDate = newChat.date;
                            chat.users = [newChat.from, newChat.to];
                        }

                        chat.save((err, chat) => {
                            if (err) {
                                res.json({
                                    success: false,
                                    data: {},
                                    message: `error is : ${err}`
                                });
                            } else {
                                // chat socket
                                if (global.socket_list[newChat.to.toString()] != null) {
                                    newChat.populate('from')
                                    console.log("goi emit notify-user-" + newChat.to.toString());
                                    Chat.populate(newChat, {path:"from"}, function(err, newChat) { 
                                        global.socket_list[newChat.to.toString()].emit("notify-user-" + newChat.to.toString(), { message: newChat });
                                     });
                                } else {
                                    console.log("socket null");
                                }
                                res.json({
                                    success: true,
                                    data: newChat,
                                    message: "success upload newChat"
                                })
                            }
                        });
                    }
                });
        }
    });
});

// get list chat của user đăng nhập 
router.get('/:page', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    ListChat.find({
        'users': { $in: [req.user._id] }
    })
        .populate('lastMessage')
        .populate({
            path: 'users',
            model: 'User'
        })
        .limit(10).skip(req.params.page * 10)
        .sort({ lastDate: -1 })
        .exec((err, list_chat) => {
            if (err) {
                res.json({
                    success: false,
                    data: {},
                    message: `error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: list_chat,
                    message: "succsess"
                })
            }
        });
});


// get list chat của user với 1 người
router.get('/list_chat/:user_id/:page', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Chat.find({  'users': { $all: [req.user._id,req.params.user_id] } })
        .populate('to')
        .populate('from')
        .limit(10).skip(req.params.page * 10)
        .sort({ date: 1 })
        .exec((err, list_chat) => {
            if (err) {
                res.json({
                    success: false,
                    data: {},
                    message: `error is : ${err}`
                });
            } else {
                res.json({
                    success: true,
                    data: list_chat,
                    message: "succsess"
                })
            }
        });
});

module.exports = router;
