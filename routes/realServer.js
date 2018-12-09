var express = require('express');
var router = express.Router();
var Post = require('../models/PostModel');
var Meeting = require('../models/MeetingModel');
var Notification = require('../models/NotificationModel');
var WaitingNoti = require('../models/WaitingNotiModel');
var Rate = require('../models/RateModel');
var request = require('request');
var cheerio = require('cheerio');
var Voucher = require('../models/VoucherModel');
const puppeteer = require('puppeteer');
var Voucher = require('../models/VoucherModel');
var NodeGeocoder = require('node-geocoder');

var options = {
    provider: 'google',

    // Optional depending on the providers
    httpAdapter: 'https', // Default
    apiKey: 'AIzaSyAYeioT8rfZ8cneHLICZFdF3K2PCCg1tPY', // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
};


class RealServer {

    constructor() {
    }

    setStatusPost() {
        Post.find(
            {
                'is_active': true, $where: function () {
                    return this.time.getTime() < Date.now();
                }
            }
        ).exec((err, posts) => {
            if (err) {
                console.log(err);
            } else if (!posts) {
                console.log("Post not found");
            } else {
                // console.log('Số bài post hết hạn được xét lại status: ' + posts.);
                for (let item of posts) {
                    item.is_active = false;
                    item.save((err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('Vừa gọi API set lại status Post');
                        }
                    });
                }
            }
        });
    }

    setStatusMeeting() {
        Meeting.find(
            {
                'is_finished': false, $where: function () {
                    return (this.time.getTime()) < Date.now();
                }
            }
        ).exec((err, meetings) => {
            if (err) {
                console.log(err);
            } else if (!meetings) {
                console.log("Meeting not found");
            } else {
                for (let item of meetings) {
                    item.is_finished = true;
                    item.save((err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('Vừa gọi API set lại status Meeting');
                        }
                    });
                }
            }
        });
    }

    sendNotiMeeting() {
        Meeting.find(
            {
                'is_finished': true, 'is_send_noti': false, $where: function () {
                    return (this.time.getTime() + (1 * 3600 * 1000) / 60) < Date.now(); // sau 24 tiếng thì gọi lệnh này 1 lần
                }
            }
        ).exec((err, meetings) => {
            if (err) {
                console.log(err);
            } else if (!meetings) {
                console.log("Meeting not found");
            } else {
                for (let item of meetings) {
                    item.is_send_noti = true;

                    item.save((err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            item.joined_people.forEach(function (userID) {
                                // Create Notification in Database
                                var newNoti = new Notification({
                                    user_id: userID,
                                    image: item.creator.avatar,
                                    title: "Bạn có muốn đánh giá cho cuộc hẹn tại " + item.place.toString() + " đã kết thúc vào ngày hôm qua?",
                                    content: { type: 2, data: item }
                                });
                                // Attempt to save the user
                                newNoti.save(function (err, noti) {
                                    if (err) {
                                        return res.json({
                                            success: false,
                                            message: err
                                        }).status(301);
                                    }
                                    if (global.socket_list[noti.user_id.toString()] != null) {
                                        global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { rating: noti });
                                    } else {
                                        newWaiting = new WaitingNoti();
                                        newWaiting.userID = noti.user_id;
                                        newWaiting.dataNoti = noti;

                                        newWaiting.save(function (err, WaitingNoti) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log("THÊM waiting Noti: " + WaitingNoti);
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    });
                }
            }
        });
    }

    sendNotiPostExpire() {


        Post.find({
            'is_active': true,
            'is_noti': false,
            $where: function () {
                return (this.time.getTime() - Date.now()) <= 5 * 3600 * 1000; // còn 5 tiếng nữa là tới thời gian đi ăn chung
            }
        }).exec((err, posts) => {
            if (err) {
                console.log(err);
            } else {
                // Xử lí tại đây nha
                posts.forEach(function (item_post) {
                    // console.log(item_post.time.getTime());
                    if (global.socket_list[item_post.creator.toString()] != null) {
                        item_post.is_noti = true;
                        item_post.save((err, post) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("Gọi Noti thành công khi bài post sáp hết hạn");
                                // Create Notification in Database
                                var newNoti = new Notification({
                                    user_id: post.creator,
                                    // type: 2, // 2 = type Meeting
                                    image: post.image,
                                    title: "Bài post của bạn sắp hết hạn !",
                                    content: { type: 1, data: post }
                                });
                                // Attempt to save the user
                                newNoti.save(function (err, noti) {
                                    if (err) {
                                        return res.json({
                                            success: false,
                                            message: err
                                        }).status(301);
                                    }
                                    if (global.socket_list[noti.user_id.toString()] != null) {
                                        console.log("goi emit notify-user-" + noti.user_id.toString());
                                        global.socket_list[noti.user_id.toString()].emit("notify-user-" + noti.user_id.toString(), { nomal: noti });
                                    } else {
                                        console.log("socket ở hàm sendNotiPostExpire null");
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    setDefaultRating() {
        var myPromise = new Promise(function (resolve, reject) {
            Meeting.find(
                {
                    'is_finished': true, $where: function () {
                        return (this.time.getTime() - Date.now()) >= 24 * 3600 * 1000 * 3; // Sau 3 ngày kết thúc cuộc hẹn
                        // return (this.time.getTime() < Date.now()); // Sau 3 ngày kết thúc cuộc hẹn
                    }
                }
            ).exec((err, meetings) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else if (!meetings) {
                    console.log("meetings not found");
                    reject("err meeting not found!");
                } else {
                    resolve(meetings);
                }
            });
        });
        myPromise.then(function (result) {
            // console.log(result);
            var list_creator = [];
            var list_evaluate = [];
            result.forEach(item_meeting => {
                // Giờ làm sao để biết meeting đó thiếu rating nào ????
                item_meeting.joined_people.forEach(creator => {
                    item_meeting.joined_people.forEach(people_evaluate => {
                        if (creator != people_evaluate) {
                            list_creator.push(creator);
                            list_evaluate.push(people_evaluate);
                        }
                    });
                });

                Rate.find({ meeting: item_meeting._id }).exec((err, rates) => {
                    rates.forEach(item_rate => {
                        for (var i = 0; i < list_creator.length; i++) {
                            if (item_rate.creator == list_creator[i] && item_rate.people_evaluate == list_evaluate[i]) {
                                list_creator.pull(i);
                                list_evaluate.pull(i);
                                i--;
                            }
                        }
                    });
                });

                for (var i = 0; i < list_creator.length; i++) {
                    newRate = new Rate();
                    newRate.creator = list_creator[i];
                    newRate.people_evaluate = list_evaluate[i];
                    User.findById(list_evaluate[i]).exec((err, user) => {
                        newRate.point = user.point_default;
                        newRate.update_date = Date.now();
                        newRate.content = "Hệ thống tự đánh giá";
                        newRate.save((err, newRating) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("tạo thành công rating với ID: " + newRating._id.toString());
                                // Xử lí update rating average: điểm đánh giá từng thằng trong meeting
                                Meeting.findById(newRating.meeting).populate('list_point_average').exec((err, meeting) => {
                                    meeting.list_point_average.forEach(item => {
                                        if (item.user == newRate.people_evaluate) {
                                            item.point_sum += newRate.point;
                                            count_people++;
                                            item.save((err) => {
                                                if (err) {
                                                    console.log(err);
                                                }
                                            });
                                        }
                                    });
                                });
                            }
                        });
                    });
                }
            });
        }, function (err) {
            console.log(err);
        })
    }

    getVoucher() {
        request("https://www.hotdeal.vn/ho-chi-minh/an-uong/?field=discountValue&sort=desc", function (err, response, body) {
            if (err) {
                console.log(err);
                return;
            } else {
                var $ = cheerio.load(body);
                var data = $(body).find("div.product-kind-1");
                var list_voucher = [];
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

                    list_voucher.push(newVoucher);

                });
                let promiseArr = list_voucher.map(function (voucher) {
                    var myPromise = new Promise(function (resolve, reject) {
                        var geocoder = NodeGeocoder(options);
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
                    Voucher.remove({}, function (err) {
                        if (err) {
                            console.log(err);
                            return;
                        } else {
                            Voucher.create(list_voucher, function (err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log("luu thanh cong " + list_voucher.length.toString() + " voucher hot deal");
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
                                                var geocoder = NodeGeocoder(options);
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
                                            // console.log(list_voucher_foody);
                                            Voucher.create(list_voucher_foody, function (err) {
                                                if (err) {
                                                    console.log(err);
                                                } else {
                                                    console.log("luu thanh cong " + list_voucher_foody.length.toString() + " voucher foody");
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
                    return res.json({
                        success: false,
                        message: err,
                    }).status(404);
                });


            }
        });
    }
}

module.exports = RealServer;