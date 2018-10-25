var express = require('express');
var router = express.Router();
var Post = require('../models/PostModel');

class RealServer {

    constructor() {
    }

    setStatusPost() {
        Post.find(
            { 'is_active': true, $where: function() {
                return this.expires_time < Date.now();
            }}
        ).exec((err, posts) => {
            if (err) {
                console.log(err);
            } else if(!posts) {
                console.log("Post not found");
            } else {
                console.log(posts);
                for (let item of posts) {
                    item.is_active = false;
                    item.save((err) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
            }
        });
    }
}

module.exports = RealServer;