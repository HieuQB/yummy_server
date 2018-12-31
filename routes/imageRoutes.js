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

const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // reject a file
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});

router.post('/upload', upload.single('file'), passport.authenticate('jwt', {
  session: false,
  failureRedirect: '/unauthorized'
}), function (req, res, next) {
  res.json({
    success: true,
    data:  req.file.path,
    message: "succsess"
  });
});
module.exports = router;
