var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');

var ico = require('./../index.js');
var THREE = require('three');
var Gate = require('gate');
var K = 1000;
var _DEBUG = false;
var async = require('async');
var Table = require('cli-table');
var humanize = require('humanize');

var LIMIT = 3;

/** **************************************************
 * tests the creation and modification scripts
 *
 */

/** ************* CLOSURE ***********************
 *
 */

function _n(n) {
    return humanize.numberFormat(n, 4);
}

function _d2(a, b) {
    var xd = a.x - b.x;
    var yd = a.y - b.y;
    var zd = a.z - b.z;
    var out = Math.sqrt((xd * xd) + (yd * yd) + (zd * zd));

    return out;
}

var POINT_LENGTHS = [12, 42, 162, 642];

tap.test('ico', {timeout: 1000 * 1000, skip: false }, function (suite) {

    suite.test('write_to_mongo', {timeout: 1000 * 1000, skip: false }, function (wtm_test) {

        var test_db = 'test_ico_' + Math.floor(Math.random() * 1000000);
        //    test_db = 'test_ico_528723';

        ico.model.init(test_db, function () {

            wtm_test.test('make_sectors', {timeout: 1000 * 1000, skip: false }, function (emit_test) {

                async.series([
                    function (callback) {
                        console.log('making points and faces');
                        ico.write_to_mongo.make_points_and_faces(callback, 0, LIMIT);
                    },
                    function (callback) {
                        console.log('linking points');
                        ico.write_to_mongo.link_identical_points(callback, 0, LIMIT);
                    },
                    function (callback) {
                        console.log('emitting neighbors');
                        ico.write_to_mongo.emit_neighbors(callback, 0, LIMIT);
                    },
                    function (callback) {
                        console.log('making sectors');
                        ico.write_to_mongo.make_sectors(callback, 0, LIMIT);
                    }
                ], function () {
                    console.log('done with make_sectors');

                    ico.model.Point().report(0, function (err, table) {
                        console.log(table);

                        console.log('points 2 after making_sectors');

                        ico.model.Point().report(2, function (err, table) {
                            console.log(table);
                            emit_test.end();
                        }, 30, 5);
                    }, 10, 5);

                });
            });

            wtm_test.end();

        }); // end init
    });

});