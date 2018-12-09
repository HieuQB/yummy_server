var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var passport = require('passport');
var Voucher = require('../models/VoucherModel');
const puppeteer = require('puppeteer');

router.get('/', function (req, res, next) {
    async function run() {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.foody.vn/ho-chi-minh/khuyen-mai');

        const result = await page.evaluate(() => {
            let data = [];
            let elements = document.querySelectorAll('.new-promotion-item > .pro-image > a > img');

            elements.forEach((el) => {
                data.push(el.getAttribute('src'));
            })

            return data;
        });

        await browser.close();

        return result;
    }

    run().then((value) => {
        console.log(value);
        res.json({
            success: true,
            data: value,
            message: "get list voucher success"
        });
    });
});

router.get('/:page', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Voucher.find()
        .limit(10).skip(req.params.page * 10)
        .sort({ price_discount: -1 }).exec((err, list_voucher) => {
            if (err)
                res.json({
                    success: false,
                    data: {},
                    message: `Error: ${err}`
                });
            else if (list_voucher) {
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

router.post('/search_voucher/:page', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    Voucher.find({
        'location': { $in: req.body.list_location }
    })
        .limit(10).skip(req.params.page * 10)
        .sort({ price_discount: -1 }).exec((err, list_voucher) => {
            if (err)
                res.json({
                    success: false,
                    data: {},
                    message: `Error: ${err}`
                });
            else if (list_voucher) {
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