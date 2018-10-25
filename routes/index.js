var express = require('express');
var router = express.Router();
// var io = require("socket.io").listen(server);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Yummy' });
});

// io.sockets.on('connection',function(socket) {
//   console.log("Co nguoi ket noi");
// });

module.exports = router;
