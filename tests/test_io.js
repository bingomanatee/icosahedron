var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');

tap.test('icosahedron', {timeout: 1000 * 10, skip: false }, function (suite) {

    var ico = require('./../index.js');

    suite.test('faces', {timeout: 1000 * 10, skip: false }, function (face_test) {

        face_test.test('level 0 faces', function (face_0_test) {
            ico.io.faces( function (err, faces) {

                face_0_test.equal(faces.length, 20, 'level 0 faces have 20 faces');
                face_0_test.end();
            }, 0)

        });

        face_test.end();
    });

    suite.test('points', {timeout: 1000 * 10, skip: false }, function (point_test) {

        point_test.test('io point', {timeout: 1000 * 10, skip: false }, function (io_test) {
            ico.io.points(function (err, data) {

                io_test.equal(data.length, 12, '12 points in level 0 planet');

                io_test.end();
            }, 0);
        });


        point_test.test('io sector', {timeout: 1000 * 10, skip: false }, function (io_test) {
            ico.io.points(function (err, data) {

                io_test.equal(data.length, 6, 'six points in a level 1 sector');

                io_test.end();
            }, 1, 0);
        });

        point_test.end();
    });

    suite.end();

});