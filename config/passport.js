var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('../models/userModel');
var config = require('../config/main');

// Setup work and export for the JWT passport strategy
module.exports = function(passport) {
    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
    opts.secretOrKey = config.secret;
    opts.expiresIn = "5s";
    passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
        User.findOne({email: jwt_payload.email}, function(err, user) {
            if (err) {
                return done(err, false);
            }
            if (user) {
                done(null, user);
            } else {
                done(null, false);
            }
        });
    }));
};