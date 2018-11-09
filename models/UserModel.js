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
        // match: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/
    },
    avatar: {
        type: String,
    },
    address: {
        type: String,
    },
    latlngAddress : {
        type: {coordinates: {type: [Number], index: '2d', spherical: true}},
    },
    gender: {
        type: Number,
    },
    birthday:{
        type: Date,
    },
    phone: {
        type: String,
    },
    myCharacter: {
         type : [{type: Number, ref: 'Character'}],
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
    trust_point: {
        type: Number,
        default: 50
    },
    main_point:{
        type: Number,
        default: 0 
    },
    count_people_evaluate: {
        type: Number,
        default:0
    }, 
    count_meeting: {
        type: Number,
        default: 0
    },
    count_post: {
        type: Number,
        default: 0
    }
}, {
    versionKey: false
});
UserSchema.plugin(autoIncrement.plugin,'User');

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