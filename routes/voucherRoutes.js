var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var passport = require('passport');
var Voucher = require('../models/VoucherModel');

router.get('/', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    request("https://www.now.vn/", function (err, response, body) {
        if (err) {
            return res.json({
                success: false,
                message: err,
                data: {}
            }).status(404);
        } else {
            console.log(response);
            // console.log(body);
            // var $ = cheerio.load(body);
            // var data = $(body).find("div.highlight-events");
            // console.log(data);
            
            // data.each(function (index, element) {
            //     // console.log($(this).text());
            //     if(index == 1) {
            //         // console.log($(this));
            //         let image = $(this).find('.product__image > a > img').attr('src');
            //         console.log(image);

            //         let title =  $(this).find('.product__header .product__title > a').text();
            //         console.log(title);

            //         let location = $(this).find('.item__location').text();
            //         console.log(location);

            //         let price = $(this).find('._product_price .price__value').text();
            //         console.log(price);

            //         let price_old = $(this).find('._product_price_old .price__value').text();
            //         console.log(price_old);

            //         let price_discount = $(this).find('._product_price .price__discount').text();
            //         console.log(price_discount);

            //         let link = element["attribs"]["data-url"];
            //         console.log("https://www.hotdeal.vn" + link);
            //     }
                // console.log(index);
                // console.log(element["attribs"]);
            // });
            return res.json({
                success: true,
                message: "get thành công",
                data: {}
            }).status(200);
        }
    });
});

router.get('/:page', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Voucher.find()
    .limit(10).skip(req.params.page * 10)
    .sort({price_discount: -1}).exec((err,list_voucher) => {
        if(err)
        res.json({
            success: false,
            data: {},
            message: `Error: ${err}`
        });
    else if(list_voucher) {
        res.json({
            success: true,
            data: list_voucher,
            message: "get list voucher success"
        });
    } else {
        res.json({
            success: false,
            data: {},
            message: "list_voucher not found"
        });
    }
    });
});

module.exports = router;