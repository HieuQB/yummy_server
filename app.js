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
mongoose.connect('mongodb://localhost:27017/yummysolution').then(
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
