var express = require('express');
var router = express.Router();
var Notification = require('../models/NotificationModel');
var passport = require('passport');


// Lấy danh sách notification 
router.get('/', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Notification.find({user_id:req.user._id})
    .sort({ created_date: -1 })
    .exec((err, noti) => {
        if (err) {
            res.json({
                success: false,
                data: [],
                message: `Error is : ${err}`
            });
        } else {
            res.json({
                success: true,
                data: noti,
                message: "success"
            });
        }
    });

});

module.exports = router;