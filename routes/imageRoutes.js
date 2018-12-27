var fs = require('fs');
var express = require('express');
var router = express.Router();

router.post('/upload', function (req, res) {
    console.log(req.files.image.originalFilename);
    console.log(req.files.image.path);
    fs.readFile(req.files.image.path, function (err, data) {
        var dirname = "/opt/yummy";
        var newPath = dirname + "/images/" + req.files.image.originalFilename;
        fs.writeFile(newPath, data, function (err) {
            if (err) {
                res.json({ 'response': "Error" });
            } else {
                res.json({ 'response': "Saved" });
            }
        });
    });
});


router.get('/uploads/:file', function (req, res) {
    file = req.params.file;
    var dirname = "/opt/yummy";
    var img = fs.readFileSync(dirname + "/images/" + file);
    res.writeHead(200, { 'Content-Type': 'image/jpg' });
    res.end(img, 'binary');
});
module.exports = router;