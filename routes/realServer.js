var express = require('express');
var router = express.Router();
var Post = require('../models/PostModel');
var Meeting = require('../models/MeetingModel');
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
                console.log('Số bài post hết hạn được xét lại status: '+ posts.length);
                for (let item of posts) {
                    item.is_active = false;
                    item.save((err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('Vừa gọi API set lại status Post');
                        }
                    });
                }
            }
        });
    }

    setStatusMeeting () {
        Meeting.find(
            { 'is_finished': false, $where: function() {
                return (this.time + 60*60*6*1000) < Date.now(); // sau 6 tiếng thì gọi lệnh này 1 lần
            }}
        ).exec((err, meetings) => {
            if (err) {
                console.log(err);
            } else if(!meetings) {
                console.log("Meeting not found");
            } else {
                console.log('số meeting hết hạn được xét lại status: '+meetings.length);
                for (let item of meetings) {
                    item.is_finished = true;
                    item.save((err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('Vừa gọi API set lại status Meeting');
                        }
                    });
                }
            }
        });
    }
}

module.exports = RealServer;