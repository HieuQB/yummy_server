//Require Mongoose
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var autoIncrement = require('mongoose-auto-increment-fix');

delete mongoose.connection.models['User'];

//Define a schema
var UserSchema = new Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
        required: true,
        match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    },
    password: {
        type: String,
        match: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/
    },
    avatar: {
        type: String,
    },
    address: {
        type: String,
    },
    gender: {
        type: String,
    },
    birthday:{
        type: String,
    },
    phone: {
        type: String,
    },
    latlngAdress: {
        type : String,
    },
    myCharacter: {
        type : String,
    },
    myStyle: {
        type : String,
    },
    targetCharacter: {
        type : String,
    },
    targetStyle: {
        type : String,
    },
    targetFood: {
        type : String,
    },
}, {
    versionKey: false
});
UserSchema.plugin(autoIncrement.plugin,{model: 'User', startAt:1});

// Saves the user's password hashed (plain text password storage is not good)
UserSchema.pre('save', function (next) {
    var user = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

// Create method to compare password input to password saved in database
UserSchema.methods.comparePassword = function(pw, cb) {
    bcrypt.compare(pw, this.password, function(err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

UserSchema.methods.toJSON = function() {
    var obj = this.toObject();
    delete obj.password;
    return obj;
}

module.exports  = mongoose.model('User', UserSchema);