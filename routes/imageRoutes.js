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

// const multer = require('multer');
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './uploads/');
//   },
//   filename: function (req, file, cb) {
//     cb(null, new Date().toISOString() + file.originalname);
//   }
// });

// const fileFilter = (req, file, cb) => {
//   // reject a file
//   if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
//     cb(null, true);
//   } else {
//     cb(null, false);
//   }
// };

// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 1024 * 1024 * 5
//   },
//   fileFilter: fileFilter
// });

// router.post('/upload', upload.array('picture',12), passport.authenticate('jwt', {
//   session: false,
//   failureRedirect: '/unauthorized'
// }), function (req, res, next) {
//   console.log(upload);
//   console.log("req.file");
//   console.log(req.file); 
//   console.log("req.files");
//   console.log(req.files);
//   console.log("req.body.file");
//   console.log(req.body.file);  
//   res.json({
//     success: true,
//     data:  req.files[0].path,
//     message: "succsess"
//   });
// });


var multer, storage, path, crypto;
multer = require('multer')
path = require('path');
crypto = require('crypto');

// Include the node file module
var fs = require('fs');

storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    return crypto.pseudoRandomBytes(16, function (err, raw) {
      if (err) {
        return cb(err);
      }
      return cb(null, "" + (raw.toString('hex')) + (path.extname(file.originalname)));
    });
  }
});


// Post files
router.post(
  "/upload",
  multer({
    storage: storage
  }).single('picture'), function (req, res) {
    console.log(req.file);
    console.log(req.body);
    // res.redirect("/uploads/" + req.file.filename);
    console.log(req.file.filename);
    res.json({
      success: true,
      data:"/uploads/"+req.file.filename,
      message: "succsess"
    });
  });

router.get('/uploads/:upload', function (req, res) {
  file = req.params.upload;
  console.log(req.params.upload);
  var img = fs.readFileSync(__dirname + "/uploads/" + file);
  res.writeHead(200, { 'Content-Type': 'image/png' });
  res.end(img, 'binary');

});

module.exports = router;
