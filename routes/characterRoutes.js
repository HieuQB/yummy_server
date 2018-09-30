var express = require('express');
var router = express.Router();
var Character = require('../models/CharacterModel');

router.get('/', (req, res, next) => {
    var page = req.param("page");
    var query = req.param("q");
    if(!query) query = "";
    Character.find({name: {$regex : new RegExp(query, "i")}}).limit(10).skip(page * 10).exec((err, categories) => {
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

router.post('/', (req, res, next) => {
    const newCharacter = new Character(req.body);

    newCharacter.save((err) => {
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
                data: newCharacter,
                message: "success upload new Character"
            })
        }
    });
});

router.use('/:CharacterId', (req, res, next) => {
    Character.findById(req.params.CharacterId).exec((err, Character) => {
        if(err)
            res.json({
                success: false,
                data: {},
                message: `Error: ${err}`
            });
        else if(Character) {
            req.Character = Character;
            next();
        } else {
            res.json({
                success: false,
                data: {},
                message: "Character not found."
            });
        }
    })
});

router.put('/:CharacterId', (req, res, next) => {
    if(req.body._id)
        delete req.body._id;
    for (var p in req.body) {
        req.Character[p] = req.body[p];
    }

    req.Character.save((err) => {
        if (err)
            res.status(500).send(err);
        else
            res.json({
                success: true,
                message: "update Character success",
                data: req.Character
            });
    });
});

router.delete('/:CharacterId', (req, res, next) => {
    req.Character.remove((err) => {
        if(err)
            res.json({
                success: false,
                message: `Error: ${err}`
            });
        else
            res.json({
                success: true,
                message: "delete Character success"
            });
    });
});


module.exports = router;