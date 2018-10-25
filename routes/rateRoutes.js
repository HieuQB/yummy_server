var express = require('express');
var router = express.Router();
var Rate = require('../models/RateModel');
var passport = require('passport');
var Meeting = require('../models/MeetingModel');
var User = require('../models/UserModel');

// Thêm rating
router.post('/', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {

    const newRate = new Rate(req.body);
    Meeting.findById(newRate.meeting)
        .exec((err, meeting) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else if (meeting) {
                if (meeting.joined_people.indexOf(newRate.creator) > -1) {
                    //In the array!
                } else {
                    //Not in the array
                    return res.json({
                        success: false,
                        data: {},
                        message: "user not in this meeting",
                        status: 404
                    });
                }
            }
            else {
                return res.json({
                    success: false,
                    data: {},
                    message: "meeting not found",
                    status: 404
                });
            }
        });
    if (newRate.point < 0 || newRate.point > 10) {
        return res.json({
            success: false,
            data: {},
            message: "point not in 1 to 10",
            status: 404
        });
    }
    newRate.save(function(err,rate) {
        if (err) {
            res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        }
        else {
            User.findById(rate.people_evaluate).exec((err,user) => {
                if (err) {
                    return res.json({
                        success: false,
                         data: {},
                        message: `error is : ${err}`
                    });
                }
                if (user) {
                    user.trust_point += rate.point;
                    user.save(function(err,userlast){
                        if (err) {
                            res.json({
                                success: false,
                                data: {},
                                message: `error is : ${err}`
                            });
                        } else {
                            console.log(userlast);
                        }
                    });
                } else {
                    return res.json({
                        success: false,
                        message: 'user not found',
                        status: 500
                    });
                }
            });
            return res.json({
                success: true,
                data: rate,
                message: "success upload new rate",
                status: 200
            })
        }
    });
});

module.exports = router;