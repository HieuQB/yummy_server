var express = require('express');
var router = express.Router();
var Post = require('../models/PostModel');
var User = require('../models/UserModel');
var Reaction = require('../models/ReactionModels');
var passport = require('passport');

router.use('/:postId/reaction', (req, res, next) => {
    Post.findById(req.params.postId).populate('reaction').populate('creator').exec((err, post) => {
        if (err)
            res.json({
                success: false,
                message: `Error: ${err}`
            });
        else if (post) {
            req.post = post;
            next();
        }
        else {
            res.json({
                success: false,
                data: {},
                message: "post not found"
            });
        }
    });
});

router.use('/:postId/reaction', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), (req, res, next) => {
    var i;
    var reactionId;
    for (i = 0; i < req.post.reaction.length; i++) {
        if (req.user.id.localeCompare(req.post.reaction[i].creator) === 0) {
            reactionId = req.post.reaction[i]._id;
            break;
        }
    }
    if (reactionId) {
        Reaction.findById(reactionId).exec((err, reaction) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else if (reaction) {
                req.reaction = reaction;
                next();
            } else {
                res.json({
                    success: false,
                    data: {},
                    message: "reaction not found"
                })
            }
        })
    } else
        next();
});

router.post('/:postId/reaction', (req, res, next) => {
    if (req.reaction) {
        //change reaction
        if (req.body.status_reaction !== 1 && req.body.status_reaction !== 2) {
            res.json({
                success: false,
                data: {},
                message: 'Field status_reaction is invalid'
            })
        } else {
            if (req.reaction.status_reaction === req.body.status_reaction) {
                //delete reaction
                req.reaction.remove((err) => {
                    if(err)
                        res.json({
                            success: true,
                            message: `Error when delete reaction ${err}`
                        });
                    else
                    if(req.reaction.status_reaction === 1) {
                        req.post.like_amount -= 1;
                    } else {
                        req.post.dislike_amount -= 1;
                    }
                    req.post.reaction.remove(req.reaction);
                    req.post.save((err, post) => {
                        if(err)
                            res.json({
                                success: false,
                                data: {},
                                message: `Error: ${err}`
                            });
                        else
                            res.json({
                                success: true,
                                data: post,
                                message: 'Success update reaction'
                            });
                    })
                })
            } else {
                req.reaction.status_reaction = req.body.status_reaction;
                req.reaction.modify_date = Date.now();
                req.reaction.save((err) => {
                    if (err) {
                        res.json({
                            success: false,
                            data: {},
                            message: `Error: ${err}`
                        });
                    } else {
                        if (req.reaction.status_reaction === 1) {
                            req.post.like_amount += 1;
                            req.post.dislike_amount -= 1;
                        } else {
                            req.post.dislike_amount += 1;
                            req.post.like_amount -= 1;
                        }
                        req.post.save((err) => {
                            if (err)
                                res.json({
                                    success: false,
                                    data: {},
                                    message: `Error: ${err}`
                                });
                            else
                                res.json({
                                    success: true,
                                    data: req.post,
                                    message: 'Success update reaction'
                                });
                        })

                    }
                })
            }
        }
    }
    else {
        //create reaction
        req.reaction = new Reaction(req.body);
        req.reaction.creator = req.user;
        if (req.reaction.status_reaction !== 1 && req.reaction.status_reaction !== 2) {
            res.json({
                success: false,
                data: {},
                message: 'Field status_reaction is invalid'
            })
        } else {
            req.reaction.save((err) => {
                if (err) {
                    res.json({
                        success: false,
                        data: {},
                        message: `Error: ${err}`
                    });
                } else {
                    req.post.reaction.push(req.reaction);
                    if (req.reaction.status_reaction === 1) {
                        req.post.like_amount += 1;
                    } else {
                        req.post.dislike_amount += 1;
                    }
                    req.post.save((err) => {
                        if (err)
                            res.json({
                                success: false,
                                data: {},
                                message: `Error: ${err}`
                            });
                        else
                            res.json({
                                success: true,
                                data: req.post,
                                message: "Create reaction success"
                            });
                    })

                }
            })
        }

    }
});

router.put('/:postId/reaction', (req, res, next) => {
    if (req.reaction) {
        if (req.body.status_reaction !== 1 && req.body.status_reaction !== 2) {
            res.json({
                success: false,
                data: {},
                message: 'Field status_reaction is invalid'
            })
        } else {
            if (req.reaction.status_reaction === req.body.status_reaction) {
                res.json({
                    success: false,
                    data: {},
                    message: 'Field status_reaction not change'
                });
            } else {
                req.reaction.status_reaction = req.body.status_reaction;
                req.reaction.modify_date = Date.now();
                req.reaction.save((err) => {
                    if (err) {
                        res.json({
                            success: false,
                            data: {},
                            message: `Error: ${err}`
                        });
                    } else {
                        if (req.reaction.status_reaction === 1) {
                            req.post.like_amount += 1;
                            req.post.dislike_amount -= 1;
                        } else {
                            req.post.dislike_amount += 1;
                            req.post.like_amount -= 1;
                        }
                        req.post.save((err) => {
                            if (err)
                                res.json({
                                    success: false,
                                    data: {},
                                    message: `Error: ${err}`
                                });
                            else
                                res.json({
                                    success: true,
                                    data: req.reaction,
                                    message: 'Success update reaction'
                                });
                        })

                    }
                })
            }
        }
    } else {
        res.json({
            success: false,
            data: {},
            message: 'You haven\'t reacted this post.'
        });
    }
});

router.delete('/:postId/reaction', (req, res, next) => {
    if (req.reaction) {
        req.reaction.remove((err) => {
            if (err)
                res.json({
                    success: true,
                    message: `Error when delete reaction ${err}`
                });
            else
                res.json({
                    success: true,
                    message: "delete reaction success"
                });
        })
    } else {
        res.json({
            success: false,
            data: {},
            message: 'You haven\'t reacted this post.'
        });
    }
});

module.exports = router;
