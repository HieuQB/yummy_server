var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment-fix');

var VoucherSchema = new Schema({
    image: {type: String, default: ""},
    title: {type: String},
    location: {type: String},
    price: {type: String},
    price_old: {type: String},
    price_discount: {type: String},
    link: {type: String},
    rate: {type: String},
    store: {type: String},
    host: {type: String}
}, {
    versionKey: false
});
VoucherSchema.plugin(autoIncrement.plugin,'Voucher');
	
module.exports = mongoose.model('Voucher', VoucherSchema);