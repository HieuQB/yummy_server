var express = require('express');
var router = express.Router();
var Rate = require('../models/RateModel');
var passport = require('passport');
var Meeting = require('../models/MeetingModel');
var User = require('../models/UserModel');
var RatingAverage = require('../models/RatingAverageModel');

// Thêm rating cho meeting
router.post('/rating_meeting', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    if (req.user._id == req.body.people_evaluate) {
        return res.json({
            success: false,
            data: {},
            message: "error: craetor va people_evaluate bang nhau",
            status: 404
        });
    } else {
        const newRate = new Rate(req.body);
        newRate.creator = req.user;
        newRate.type_rating = 1;
        Meeting.findById(newRate.meeting).populate('list_point_average')
            .exec((err, meeting) => {
                if (err)
                    res.json({
                        success: false,
                        message: `Error: ${err}`
                    });
                else if (meeting) {
                    if (meeting.joined_people.indexOf(newRate.creator._id) > -1) {
                        //In the array!
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
                                var ratingAverage = null;
                                meeting.list_point_average.forEach(item => {
                                    if (item.user == rate.people_evaluate) {
                                        ratingAverage = item;
                                    }
                                });
                                if (!ratingAverage)
                                    return res.json({
                                        success: false,
                                        data: {},
                                        message: "khong ton tai rating average"
                                    });

                                ratingAverage.count_people++;
                                ratingAverage.point_sum = ratingAverage.point_sum + rate.point;
                                ratingAverage.save(function (err) {
                                    if (err) {
                                        return res.json({
                                            success: false,
                                            data: {},
                                            message: "can not rating meeting"
                                        });
                                    }
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
                                                    return res.json({
                                                        success: true,
                                                        data: rate,
                                                        message: "success upload new rate meeting",
                                                        status: 200
                                                    })
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

                            }
                        });
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
    }
});

//update rating meeting
router.post('/update_rating_meeting/:ratingID', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Rate.findById(req.params.ratingID).exec((err, rate) => {
        if (rate.creator != req.user._id) {
            return res.json({
                success: false,
                data: {},
                message: "bạn không có quyền cập nhật"
            });
        }
        if (err) {
            return res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        } else {
            if (!rate) {
                return res.json({
                    success: true,
                    data: {},
                    message: "rate not found"
                });
            } else {
                var change_point = req.body.point - rate.point;
                if (req.body.content)
                    rate.content = req.body.content;
                if (req.body.point)
                    rate.point = req.body.point;
                rate.update_date = Date.now();
                rate.save(function(err,newRate) {
                    if (err) {
                        return res.json({
                            success: false,
                            data: {},
                            message: `error is : ${err}`
                        });
                    } else {
                        Meeting.findById(newRate.meeting).populate('list_point_average').exec((err,meeting) => {
                            if (err) {
                                return res.json({
                                    success: false,
                                    data: {},
                                    message: `error is : ${err}`
                                });
                            } else {
                                meeting.list_point_average.forEach(item => {
                                    if (item.user == newRate.people_evaluate) {
                                        item.point_sum += change_point;
                                        item.save((err)=> {
                                            if (err) {
                                                return res.json({
                                                    success: false,
                                                    data: {},
                                                    message: `error is : ${err}`
                                                });
                                            } else {
                                                return res.json({
                                                    success: true,
                                                    data: newRate,
                                                    message: "update rating meeting success"
                                                });
                                            }
                                        });
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

// thêm rating cho profile
router.post('/rating_people', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    if (req.user._id == req.body.people_evaluate) {
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
    }

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
    });
});

router.put('/:rateId', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    console.log(req.rating);
    if (req.user._id != req.rating.creator) {
        return res.json({
            success: false,
            data: {},
            message: "error: ban khong co quyen cap nhat",
            status: 404
        });
    } else {
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
    }

});

// xóa ratting
router.delete('/:rateId', passport.authenticate('jwt', {
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
            if (req.user._id != rating.creator) {
                return res.json({
                    success: false,
                    data: {},
                    message: "error: ban khong co quyen xoa",
                    status: 404
                });
            } else {
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
            }
        } else {
            res.json({
                success: false,
                data: {},
                message: "rating not found."
            });
        }
    });
});


// ấn cancel, gọi API này để rating mặc định cho những user khác?? 
// ủa nếu ấn cancel thì hôm khác vô đánh giá, 
// rồi nếu sau 3 ngày mà k chịu làm thì server tự động đánh giá luôn cũng đc 
// Nếu làm thì gọi 1 lần API rồi đánh giá điểm mặc định cho nhiều người 
// hay là mỗi lần cancel là chỉ đánh giá mặc định cho 1 người

module.exports = router;
