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
    latlngAddress: { coordinates: { type: [Number], index: '2d', spherical: true , default: [106.779495,10.863731]} },
    gender: {
        type: Number, // 1 là nam, 0 là nữ
    },
    birthday: {
        type: Date,
    },
    age: {
        type: Number,
    },
    phone: {
        type: String,
    },
    myCharacter: {
        type: String,
    },
    myFavorite: [{
        type: Number,
        ref: 'Category'
    }],
    trust_point: {
        type: Number,
        default: 50
    },
    main_point: {
        type: Number,
        default: 0
    },
    count_people_evaluate: {
        type: Number,
        default: 0
    },
    count_meeting: {
        type: Number,
        default: 0
    },
    count_post: {
        type: Number,
        default: 0
    },
    point_default: {
        type: Number,
        default: 0
    }
}, {
        versionKey: false
    });
UserSchema.plugin(autoIncrement.plugin, 'User');

UserSchema.plugin(function (schema, options) {
    schema.pre('find', function (next) {
        this.age = new Date().getFullYear() - new Date(this.birthday).getFullYear();
        next();
    })
})

// Saves the user's password hashed (plain text password storage is not good)
UserSchema.pre('save', function (next) {
    var user = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                // user.age = new Date().getFullYear() - this.birthday.getFullYear();
                next();
            });
        });
    } else {
        return next();
    }
});

// Create method to compare password input to password saved in database
UserSchema.methods.comparePassword = function (pw, cb) {
    bcrypt.compare(pw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

UserSchema.methods.toJSON = function () {
    var obj = this.toObject();
    delete obj.password;
    return obj;
}

UserSchema.pre('save', function (next) {
    var point_average_trust_point = 5;
    if (this.trust_point == 50) {
        point_average_trust_point = 5;
    } else if (this.trust_point < 100) {
        point_average_trust_point = 6;
    } else if (this.trust_point < 150) {
        point_average_trust_point = 7;
    } else if (this.trust_point < 200) {
        point_average_trust_point = 8;
    } else if (this.trust_point < 250) {
        point_average_trust_point = 9;
    } else {
        point_average_trust_point = 10;
    }
    if (this.count_people_evaluate == 0) {
        this.point_default = (point_average_trust_point + 5) / 2;
    } else {
        this.point_default = ((main_point / count_people_evaluate) + point_average_trust_point) / 2;
    }
    console.log(this.point_default);
    next();
});

module.exports = mongoose.model('User', UserSchema);