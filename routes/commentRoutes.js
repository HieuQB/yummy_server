var express = require('express');
var router = express.Router();
var Post = require('../models/PostModel');
var User = require('../models/UserModel');
var Comment = require('../models/CommentModel');
var passport = require('passport');

router.use('/:postId/comment', (req, res, next) => {
    Post.findById(req.params.postId)
        .populate('category')
        .populate({
            path: 'comments',
            model: 'Comment',
            populate: {
                path: 'creator',
                model: 'User'
            }
        })
        .exec((err, post) => {
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

router.use('/:postId/comment/:commentId', (req, res, next) => {
   Comment.findById(req.params.commentId).populate('creator').exec((err, comment) => {
       if(err)
           res.json({
               success: false,
               message: `Error: ${err}`
           });
       else if(comment) {
           req.comment = comment;
           next();
       } else {
           res.json({
               success: false,
               data: {},
               message: "comment not found"
           })
       }
   })
});

router.get('/:postId/comment', (req, res, next) => {
    res.json({
        success: true,
        data: req.post.comments,
        message: "success get list comment"
    });
});

router.post('/:postId/comment', passport.authenticate('jwt', {session: false, failureRedirect: '/unauthorized'}), (req, res, next) => {
    const comment = new Comment(req.body);
    comment.creator = req.user;

    comment.save((err) => {
        if (err) {
            res.json({
                success: false,
                data: {},
                message: `error when add new comment is : ${err}`
            });
        }
        else {
            req.post.comments.push(comment);
            req.post.save((err) => {
                if (err) {
                    res.json({
                        success: false,
                        data: {},
                        message: `error when save comment to post is : ${err}`
                    });
                }
                else {
                    res.json({
                        success: true,
                        data: comment,
                        message: "success upload new comment"
                    })
                }
            });
        }
    });
});

router.get('/:postId/comment/:commentId', function (req, res, next) {
    res.json({
        success: true,
        data: req.comment,
        message: "success get comment"
    })
});

router.put('/:postId/comment/:commentId', passport.authenticate('jwt', {session: false, failureRedirect: '/unauthorized'}), (req, res, next) => {
    if (req.body._id)
        delete req.body._id;
    //user is not creator
    if(req.user.id.localeCompare(req.comment.creator._id) === 0){
        for (var p in req.body) {
            req.comment[p] = req.body[p];
        }
        req.comment.modify_date = Date.now();

        req.comment.save((err) => {
            if (err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else
                res.json({
                    success: true,
                    message: "update comment success",
                    data: req.comment
                });
        });
    } else {
        res.json({
            success: false,
            message: "You don't have permission"
        })
    }
});

router.delete('/:postId/comment/:commentId', passport.authenticate('jwt', {session: false, failureRedirect: '/unauthorized'}), (req, res, next) => {
    if(req.user.id.localeCompare(req.comment.creator._id) === 0){
        req.comment.remove((err) => {
            if(err)
                res.json({
                    success: false,
                    message: `Error: ${err}`
                });
            else {
                req.post.comments.remove(req.comment);
                req.post.save((err) => {
                    if(err)
                        res.json({
                            success: false,
                            message: `Error: ${err}`
                        });
                    else
                        res.json({
                            success: true,
                            message: "delete comment success"
                        });
                });
            }
        });
    } else {
        res.json({
            success: false,
            message: "You don't have permission"
        })
    }
});

module.exports = router;
