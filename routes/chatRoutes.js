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

    // if (req.user._id == req.body.userChat) {
    //     res.json({
    //         success: false,
    //         data: {},
    //         message: 'không thể nhắn tin cho chính mình'
    //     });
    // } else {
    newChat = new Chat();
    newChat.from = req.user._id;
    newChat.to = req.body.to;
    newChat.date = Date.now();
    newChat.message = req.body.message;

    newChat.save((err, newChat) => {
        if (err) {
            res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        }
        else {
            ListChat.find().exec((err, list_chat) => {
                if (err) {
                    res.json({
                        success: false,
                        data: {},
                        message: `error is : ${err}`
                    });
                } else {
                    var isOld = false;
                    list_chat.forEach(element => {
                        if (element.user == newChat.to) {
                            isOld = true;
                        }
                    });

                    if (isOld) {
                        ListChat.find({ 'user': newChat.to }).exec((err, chatItem) => {
                            if (err) {
                                res.json({
                                    success: false,
                                    data: {},
                                    message: `error is : ${err}`
                                });
                            } else {
                                chatItem[0].lastDate = newChat.date;
                                chatItem[0].lastMessage = newChat.message;
                                chatItem[0].save((err, chat) => {
                                    if (err) {
                                        res.json({
                                            success: false,
                                            data: {},
                                            message: `error is : ${err}`
                                        });
                                    } else {
                                        // chat socket
                                        if (global.socket_list[newChat.to.toString()] != null) {
                                            console.log("goi emit notify-user-" + newChat.to.toString());
                                            global.socket_list[newChat.to.toString()].emit("notify-user-" + newChat.to.toString(), { message: newChat });
                                        } else {
                                            console.log("socket null");
                                            newWaiting = new WaitingNoti({
                                                userID: newChat.to,
                                                dataNoti: newChat
                                            });

                                            newWaiting.save(function (err, WaitingNoti) {
                                                if (err) {
                                                    console.log(err);
                                                } else {
                                                    console.log("THÊM waiting Noti: " + WaitingNoti);
                                                }
                                            });
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
                    } else {
                        newItemListChat = new ListChat();
                        newItemListChat.user = newChat.to;
                        newItemListChat.lastMessage = newChat.message;
                        newItemListChat.lastDate = newChat.date;

                        newItemListChat.save((err, result) => {
                            if (err) {
                                res.json({
                                    success: false,
                                    data: {},
                                    message: `error is : ${err}`
                                });
                            } else {
                                // chat socket
                                if (global.socket_list[newChat.to.toString()] != null) {
                                    console.log("goi emit notify-user-" + newChat.to.toString());
                                    global.socket_list[newChat.to.toString()].emit("notify-user-" + newChat.to.toString(), { message: newChat });
                                } else {
                                    console.log("socket null");
                                    newWaiting = new WaitingNoti({
                                        userID: newChat.to,
                                        dataNoti: newChat
                                    });

                                    newWaiting.save(function (err, WaitingNoti) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log("THÊM waiting Noti: " + WaitingNoti);
                                        }
                                    });
                                }

                                res.json({
                                    success: true,
                                    data: newChat,
                                    message: "success upload newChat"
                                })
                            }
                        });
                    }
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
    ListChat.find({})
        .populate('user')
        .limit(10).skip(req.params.page * 10)
        .sort({ lastDate: -1 })
        .exec((err,list_chat) => {
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
