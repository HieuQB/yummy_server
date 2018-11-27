# yummy_server
// Include
var request = require('request'),
    cheerio = require('cheerio'),

cloudscraper = require('cloudscraper');

var promise = new Promise(function(resolve, reject) {
            // if (token_id != undefined && token_id != '' && token_id != null) {
            //     var url_coinmarketcap = URK_COINMARKETCAP_IMG + token_id + '.png';
            //     resolve(url_coinmarketcap);
            // } else {
            //     var url_etherscan = URL_ETHERSCAN + URL_TOKEN + contract_address;
            //     request(url_etherscan, function(err, response, body) {
            //         if (err) {
            //             reject(err);
            //         }
            //         var $ = cheerio.load(body);
            //         var text = $('.pull-left').children('img').attr('src');
            //         if (text != undefined) {
            //             resolve(URL_ETHERSCAN + text);
            //         } else {
            //             resolve(false);
            //         }
            //     });
            // }
            var url_etherscan = URL_ETHERSCAN + URL_TOKEN + contract_address;
            // var url_etherscan = 'https://www.eesty.ee/';
            cloudscraper.post(url_etherscan, {}, function(error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    var $ = cheerio.load(body);
                    var text = $('.pull-left').children('img').attr('src');
                    if (text != undefined) {
                        console.log(text);
                        resolve(URL_ETHERSCAN + text);
                    } else {
                        resolve(false);
                    }
                }
            });
            
