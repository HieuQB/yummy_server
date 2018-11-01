var express = require('express');
var router = express.Router();
var Rate = require('../models/RateModel');
var passport = require('passport');
var Meeting = require('../models/MeetingModel');
var User = require('../models/UserModel');

// Thêm rating cho meeting
router.post('/rating_meeting', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {

    const newRate = new Rate(req.body);
    newRate.creator = req.user;
    newRate.type_rating = 1;
    console.log(newRate)
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
    newRate.save(function (err, rate) {
        if (err) {
            res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        }
        else {
            User.findById(rate.people_evaluate).exec((err, user) => {
                if (err) {
                    return res.json({
                        success: false,
                        data: {},
                        message: `error is : ${err}`
                    });
                }
                if (user) {
                    user.trust_point += rate.point;
                    user.save(function (err, userlast) {
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
                message: "success upload new rate meeting",
                status: 200
            })
        }
    });
});

// thêm rating cho profile
router.post('/rating_people', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
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
                data: [],
                message: "da ton tai rating nay",
                status: 404
            });
        } else {
            const newRate = new Rate(req.body); //people_evaluate, content, point
            newRate.creator = req.user;
            newRate.type_rating = 2;
            if (newRate.point < 0 || newRate.point > 10) {
                return res.json({
                    success: false,
                    data: {},
                    message: "point not in 1 to 10",
                    status: 404
                });
            }
            newRate.save(function (err, rate) {
                if (err) {
                    res.json({
                        success: false,
                        data: {},
                        message: `error is : ${err}`
                    });
                }
                else {
                    User.findById(rate.people_evaluate).exec((err, user) => {
                        if (err) {
                            return res.json({
                                success: false,
                                data: {},
                                message: `error is : ${err}`
                            });
                        }
                        if (user) {
                            user.main_point += rate.point;
                            user.count_people_evaluate++;
                            user.save(function (err, userlast) {
                                if (err) {
                                    return res.json({
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
                        message: "success upload new rate profile",
                        status: 200
                    })
                }
            });
        }
    });

});


// sửa ratting
router.use('/:rateId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Rate.findById(req.params.rateId).exec((err, rating) => {
        if (err)
            res.json({
                success: false,
                data: {},
                message: `Error: ${err}`
            });
        else if (rating) {
            req.rating = rating;
            next();
        } else {
            res.json({
                success: false,
                data: {},
                message: "rating not found."
            });
        }
    })
});

router.put('/:rateId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    if (req.body._id)
        delete req.body._id;
    var oldPoint = req.rating.point;
    for (var p in req.body) {
        req.rating[p] = req.body[p];
    }
    User.findById(req.rating.people_evaluate).exec((err, user) => {
        if (err) {
            return res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        }
        if (user) {
            user.main_point += (req.rating.point - oldPoint);
            user.save(function (err, userlast) {
                if (err) {
                    return res.json({
                        success: false,
                        data: {},
                        message: `error is : ${err}`
                    });
                } else {
                    req.rating.update_date = Date.now();
                    req.rating.save((err) => {
                        if (err)
                            res.status(500).send(err);
                        else
                            res.json({
                                success: true,
                                message: "update rating success",
                                data: req.rating
                            });
                    });
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
});

// xóa ratting
router.delete('/:rateId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {

    User.findById(req.rating.people_evaluate).exec((err, user) => {
        if (err) {
            return res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        }
        if (user) {
            user.main_point -= req.rating.point;
            user.count_people_evaluate--;
            user.save(function (err, userlast) {
                if (err) {
                    return res.json({
                        success: false,
                        data: {},
                        message: `error is : ${err}`
                    });
                } else {
                    req.rating.remove((err) => {
                        if (err)
                            res.json({
                                success: false,
                                message: `Error: ${err}`
                            });
                        else {
                            return res.json({
                                success: true,
                                message: "delete rating success"
                            });
                        }
                    });
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
});




module.exports = router;