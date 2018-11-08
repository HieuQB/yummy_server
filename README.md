# yummy_server

API tìm kiếm nên xử lí như nào ? người đang online, địa điểm gần hay xa (so sánh 2 address của 2 thằng)
Đưa hình ảnh lên server
#API list meeting thì mỗi cục data trả thêm điểm trung bình đánh giá meeting cho user được chọn
(Chưa làm đc)
Gởi thông báo gợi ý cho người dùng khi có bài viết phù hợp vừa đc đăng lên


Tìm hiểu cấu trúc blue bird của nodejs để quản lý không cho văng app.

Vào link https://www.jdoodle.com/execute-nodejs-online
Gõ 

const parseJsonAsync = (jsonString) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(JSON.parse(jsonString))
    })
  })
}

var data = '{ "name":"John", "age":30, "cars": [  { "name":"Ford", "models":[ "Fiesta", "Focus", "Mustang" ] }, { "name":"BMW", "models":[ "320", "X3", "X5" ] },  { "name":"Fiat", "models":[ "500", "Panda" ] }  ] }';
parseJsonAsync(data).then(jsonData => {
    for(let item of jsonData['cars']) {
        
     item["test"] = "1";
    }
     console.log(jsonData);
     data = JSON.stringify(jsonData);
     console.log(data);
});
   

router.post('/list_main', function (req, res, next) {
    Post.aggregate([
        {$geoNear: {
            near: [req.body.latitude, req.body.longitude],
            distanceField: 'location'
        }}
        ]).exec(function (err, posts) {
            if (err) {
                res.json({
                    success: false,
                    data: [],
                    message: `Error is : ${err}`
                });
            } else {
                Post.populate(posts, [{path: 'creator'}, {path: 'category'}, {path: 'reaction'}], function (err, results) {
                    if (err) {
                        res.json({
                            success: false,
                            data: [],
                            message: `Error is : ${err}`
                        });
                    } else {
                        const parseJsonAsync = (jsonString) => {
                          return new Promise(resolve => {
                            setTimeout(() => {
                              resolve(JSON.parse(jsonString))
                          })
                        })
                      }

                      // parseJsonAsync(results).then(jsonData => console.log(jsonData['cars'][0]['name']))
                      parseJsonAsync(results).then(jsonData => {
                            for(let item of jsonData['craetor']) {
                            // Xử lí tính toán tại đây
                            // Lấy ra các trường của Creator trong jsonData rồi lấy thêm thông tin của user đăng nhập (request) rồi dùng công thức để tính
                            
                            }

                      });

                      res.json({
                        success: true,
                        data: results,
                        message: "success"
                    });

                  }
              })
            }
        });
    });

==> sẽ lấy được data của chuỗi JSON đó , làm tương tự cho danh sách các post
==> Rồi lấy ra được thông tin của thằng Craetor -> tính toán sao đó rồi cho ra độ tương thích . Lưu lại vào chuỗi JSON rồi trả về cho người dùng.
