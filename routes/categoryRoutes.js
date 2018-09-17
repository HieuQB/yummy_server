var express = require('express');
var router = express.Router();
var Category = require('../models/CategoryModel');

router.post('/', (req, res, next) => {
    const newCategory = new Category(req.body);

    newCategory.save((err) => {
        if (err) {
            res.json({
                success: false,
                data: {},
                message: `error is : ${err}`
            });
        }
        else {
            res.json({
                success: true,
                data: newCategory,
                message: "success upload new category"
            })
        }
    });
});

router.get('/', (req, res, next) => {
    var page = req.param("page");
    var query = req.param("q");
    if(!query) query = "";
    Category.find({name: {$regex : new RegExp(query, "i")}}).limit(10).skip(page * 10).exec((err, categories) => {
        if (err) {
            res.json({
                success: false,
                data: [],
                message: `Error is : ${err}`
            });
        } else {
            res.json({
                success: true,
                data: categories,
                message: "success"
            });
        }
    });
});

router.use('/:categoryId', (req, res, next) => {
    Category.findById(req.params.categoryId).exec((err, category) => {
        if(err)
            res.json({
                success: false,
                data: {},
                message: `Error: ${err}`
            });
        else if(category) {
            req.category = category;
            next();
        } else {
            res.json({
                success: false,
                data: {},
                message: "Category not found."
            });
        }
    })
});

router.put('/:categoryId', (req, res, next) => {
    if(req.body._id)
        delete req.body._id;
    for (var p in req.body) {
        req.category[p] = req.body[p];
    }

    req.category.save((err) => {
        if (err)
            res.status(500).send(err);
        else
            res.json({
                success: true,
                message: "update category success",
                data: req.category
            });
    });
});

router.delete('/:categoryId', (req, res, next) => {
    req.category.remove((err) => {
        if(err)
            res.json({
                success: false,
                message: `Error: ${err}`
            });
        else
            res.json({
                success: true,
                message: "delete category success"
            });
    });
});

module.exports = router;