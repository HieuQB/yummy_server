var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var passport = require('passport');
var Voucher = require('../models/VoucherModel');
const puppeteer = require('puppeteer');
var NodeGeocoder = require('node-geocoder');

var options = {
    provider: 'google',
    // Optional depending on the providers
    httpAdapter: 'https', // Default
    apiKey: 'AIzaSyA3h0o1-rFTo8SIQd-Q4NwE7rT_c9JZ9ds', // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
};

var geocoder = NodeGeocoder(options);

router.get('/', function (req, res, next) {
    request("https://www.hotdeal.vn/ho-chi-minh/an-uong/?field=discountValue&sort=desc", function (err, response, body) {
        if (err) {
            console.log(err);
            return;
        } else {
            var $ = cheerio.load(body);
            var data = $(body).find("div.product-kind-1");
            var list_voucher_hotdeal = [];
            data.each(function (index, element) {
                var newVoucher = new Voucher();

                let image = $(this).find('.product__image > a > img').attr('data-original');
                let title = $(this).find('.product__header .product__title > a').text();
                let location = $(this).find('.item__location').text().trim();
                let price = $(this).find('._product_price .price__value').text();
                let price_old = $(this).find('._product_price_old .price__value').text();
                let price_discount = $(this).find('._product_price .price__discount').text();
                let link = "https://www.hotdeal.vn" + element["attribs"]["data-url"];
                let host = "HotDeal";

                newVoucher.image = image;
                newVoucher.title = title;
                newVoucher.location = location;
                newVoucher.price = price;
                newVoucher.price_old = price_old;
                newVoucher.price_discount = price_discount;
                newVoucher.link = link;
                newVoucher.host = host;

                list_voucher_hotdeal.push(newVoucher);

            });
            let promiseArrHot = list_voucher_hotdeal.map(function (voucher) {
                var myPromiseHot = new Promise(function (resolve, reject) {
                    var place = voucher.location;
                    if(voucher.location == '' || voucher.location == 'Nhiều địa điểm'){
                        console.log(voucher.location);
                        place = 'Động Phong Nha Kẻ Bàng'
                    }
                    geocoder.geocode(place)
                        .then(function (res) {
                            resolve(res);
                        })
                        .catch(function (err) {
                            // console.log(err);
                            reject(err);
                        });
                });
                myPromiseHot.then(function (result) {
                    if (result && result[0]) {
                        let coordinates = [result[0].longitude, result[0].latitude]
                        voucher.latlngAddress.coordinates = coordinates;
                    }
                    // console.log(voucher);
                    return voucher;

                }, function (err) {
                    console.log(err);
                    return voucher;
                });
            });

            Promise.all(promiseArrHot).then(function (list) {
                Voucher.remove({}, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        Voucher.create(list_voucher_hotdeal, function (err) {

                            if (err) {
                                console.log(err);
                            } else {
                                console.log("luu thanh cong " + list_voucher_hotdeal.length.toString() + " voucher hot deal");
                                async function run() {
                                    const browser = await puppeteer.launch({
                                        headless: true,
                                        args: ['--no-sandbox']
                                    });
                                    const page = await browser.newPage();
                                    await page.goto('https://www.foody.vn/ho-chi-minh/khuyen-mai');

                                    const result = await page.evaluate(() => {
                                        let list_data = [];
                                        // List image OK
                                        let list_image = [];
                                        let images = document.querySelectorAll('.new-promotion-item > .pro-image > a > img');
                                        images.forEach((el) => {
                                            list_image.push(el.getAttribute('src'));
                                        });
                                        list_data.push(list_image);

                                        //   List store OK
                                        let list_store = [];
                                        let stores = document.querySelectorAll('.res > .name > a');
                                        stores.forEach((el) => {
                                            list_store.push(el.innerText);
                                        });
                                        list_data.push(list_store);

                                        //   List link OK
                                        let list_link = [];
                                        let links = document.querySelectorAll('.new-promotion-item > .pro-short-content > .content > .res > .name > a');
                                        links.forEach((el) => {
                                            list_link.push("https://www.foody.vn/ho-chi-minh/" + el.getAttribute('href'));
                                        });
                                        list_data.push(list_link);

                                        //   List address OK
                                        let list_location = [];
                                        let locations = document.querySelectorAll('.new-promotion-item > .pro-short-content > .content > .res > .address');
                                        locations.forEach((el) => {
                                            list_location.push(el.innerText);
                                        });
                                        list_data.push(list_location);

                                        //   List rate OK
                                        let list_rating = [];
                                        let ratings = document.querySelectorAll('.pro-short-content > .content > .avg-bg-highlight');
                                        ratings.forEach((el) => {
                                            list_rating.push(el.innerText);
                                        });
                                        list_data.push(list_rating);

                                        // List title OK
                                        let list_title = [];
                                        let titles = document.querySelectorAll('.pro-short-content > .title > a > span');
                                        titles.forEach((el) => {
                                            list_title.push(el.innerText);
                                        });
                                        list_data.push(list_title);
                                        return list_data;
                                    });

                                    await browser.close();

                                    return result;
                                }

                                run().then((value) => {
                                    // List VOUCHER
                                    var list_voucher_foody = [];
                                    for (var i = 0; i < value[0].length; i++) {
                                        var newVoucher = new Voucher();
                                        newVoucher.image = value[0][i];
                                        newVoucher.title = value[5][i];
                                        newVoucher.location = value[3][i];
                                        newVoucher.link = value[2][i];
                                        newVoucher.rate = value[4][i];
                                        newVoucher.store = value[1][i];
                                        newVoucher.host = "Foody";
                                        list_voucher_foody.push(newVoucher);
                                    }

                                    let promiseArr = list_voucher_foody.map(function (voucher) {
                                        var myPromise = new Promise(function (resolve, reject) {
                                            geocoder.geocode(voucher.location)
                                                .then(function (res) {
                                                    resolve(res);
                                                })
                                                .catch(function (err) {
                                                    reject(err);
                                                });
                                        });

                                        myPromise.then(function (result) {
                                            if (result && result[0]) {
                                                let coordinates = [result[0].longitude, result[0].latitude]
                                                voucher.latlngAddress.coordinates = coordinates;
                                            }

                                            return voucher;

                                        }, function (err) {
                                            console.log(err);
                                            return voucher;
                                        });
                                    });

                                    Promise.all(promiseArr).then(function (list) {
                                        //  console.log(list_voucher_foody);
                                        Voucher.create(list_voucher_foody, function (err) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                // console.log(list_voucher_foody);
                                                console.log("luu thanh cong " + list_voucher_foody.length.toString() + " voucher foody");
                                                return res.json({
                                                    success: true,
                                                    message: "thành công",
                                                }).status(200);
                                            }
                                        });
                                    }).catch(function (err) {
                                        console.log(err);
                                    });
                                });
                            }
                        });
                    }
                });
            }).catch(function (err) {
                console.log(err);
            });


        }
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

router.get('/test_geocoder', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {

    var myPromiseHot = new Promise(function (resolve, reject) {

        geocoder.geocode("Cau vuot linh xuan")
            .then(function (res) {
                resolve(res);
            })
            .catch(function (err) {
                reject(err);
            });
    });
    myPromiseHot.then(function (result) {
        // if (result && result[0]) {
        //     let coordinates = [result[0].longitude, result[0].latitude]
        //     voucher.latlngAddress.coordinates = coordinates;
        // }
        if (result) {
            // console.log(result);
            res.json({
                success: true,
                data: result,
                message: "thành công"
            });
        }
        // console.log(voucher);
        // return voucher;

    }, function (err) {
        res.json({
            success: false,
            data: err,
            message: "loi roi"
        });
    });

    // geocoder.geocode("Cầu vượt linh xuân")
    // .then(function (response) {
    //     res.json({
    //         success: true,
    //         data: response,
    //         message: "thành công"
    //     });
    // })
    // .catch(function (err) {
    //     res.json({
    //         success: true,
    //         data: err,
    //         message: "Thất bại"
    //     });
    // });
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

router.get('/list_voucher_near/:page', passport.authenticate('jwt', {
    session: false,
    failureRedirect: '/unauthorized'
}), function (req, res, next) {
    var page = req.params.page;
    Voucher.aggregate(
        {
            $geoNear: {
                // near:  req.user.latlngAddress.coordinates ,
                near:  [106.779495,10.863731],
                distanceField: 'latlngAddress'
            }
        }
       
    )
        .exec((err, list_voucher) => {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                }).status(301);
            }
            return res.json({
                success: true,
                message: "Get list thành công",
                data: list_voucher,
            }).status(200);
        });
})

module.exports = router;