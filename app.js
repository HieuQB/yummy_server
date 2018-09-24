var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment-fix');

//Connect DB
mongoose.Promise = global.Promise;

// if OPENSHIFT env variables are present, use the available connection info:
var url = "";
if(process.env.MONGOLAB_URI) {
    url = process.env.MONGOLAB_URI + ":" + process.env.PORT + "yummy";
} else if(process.env.MONGOHQ_URL) {
    url =  process.env.MONGOHQ_URL + ":" + process.env.PORT + "yummy";
} else {
    url = 'mongodb://127.0.0.1:27017/yummy';
}

mongoose.connect(url).then(
    () => {
        console.log('Kết nối DB thành công');
    },
    err => {
        console.log(err);
    }
);

//initialize auto increament id
autoIncrement.initialize(mongoose.connection);

var index = require('./routes/index');
var users = require('./routes/userRoutes');
var postRoutes = require('./routes/postRoutes');
var commentRoutes = require('./routes/commentRoutes');
var reactionRoutes = require('./routes/reactionRoutes');
var categoryRoutes = require('./routes/categoryRoutes');

var app = express();
var server = require("http").createServer(app);
var io = require("socket.io").listen(server);
var listUser = [];
io.sockets.on('connection', function (socket) {
    console.log("co nguoi ket noi");
    socket.on('user_login', function () {
       if (listUser.indexOf(user_name) > -1) {
           return;
       }
       listUser.push(user_name);
       socket.user = user_name;
    });

    socket.on('send_message', function (message) {
        io.sockets.emit('receiver_message', {data: socket.user + ": "+ message});
    });
});

//initialize passport
app.use(passport.initialize());
require('./config/passport')(passport);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//set up routes
app.use('/', index);
app.use('/api/user', users);
app.use('/api/post',postRoutes);
app.use('/api/post', commentRoutes);
app.use('/api/post', reactionRoutes);
app.use('/api/category', categoryRoutes);

//catch unauthorized
app.get('/unauthorized', function (req, res) {
    res.status(401);
    res.json({
        success: false,
        message: "Unauthorized"
    })
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
      success: false,
      message: `Error: ${err}`
  });
});

module.exports = app;
