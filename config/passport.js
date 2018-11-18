var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('../models/UserModel.js');
var config = require('../config/main.js');

// Setup work and export for the JWT passport strategy
module.exports = function(passport) {
    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
    opts.secretOrKey = config.secret;
    opts.expiresIn = 604800;
    passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
        User.findOne({email: jwt_payload.email}, function(err, user) {
            if (err) {
                return done(err, false);
            }
            if (user) {
                done(null, user);
                console.log(user);
                if (global.socket_list[user._id.toString()] == null) {
                    global.io.sockets.emit("notify-user-" + user._id.toString(), { connect_socket: "true" });
                }
            } else {
                done(null, false);
            }
        });
    }));
};