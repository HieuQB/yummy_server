# yummy_server
Vào link https://www.jdoodle.com/execute-nodejs-online
Gõ 
const parseJsonAsync = (jsonString) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(JSON.parse(jsonString))
    })
  })
}

const data = '{ "name":"John", "age":30, "cars": [  { "name":"Ford", "models":[ "Fiesta", "Focus", "Mustang" ] }, { "name":"BMW", "models":[ "320", "X3", "X5" ] },  { "name":"Fiat", "models":[ "500", "Panda" ] }  ] }'
parseJsonAsync(data).then(jsonData => console.log(jsonData['cars'][0]['name']))

==> sẽ lấy được data của chuỗi JSON đó , làm tương tự cho danh sách các post
==> Rồi lấy ra được thông tin của thằng Craetor -> tính toán sao đó rồi cho ra độ tương thích . Lưu lại vào chuỗi JSON rồi trả về cho người dùng.
