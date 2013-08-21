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

/** **************************************************
 * tests the creation and modification scripts
 *
 */

/** ************* CLOSURE ***********************
 *
 */

function _sum(n) {
    return POINT_LENGTHS.slice(0, n).reduce(function (o, n) {
        return o + n;
    }, 0);
}

var POINT_LENGTHS = [12, 42, 162, 642];
var COUNT = _sum(3);

tap.test('ico', {timeout: 1000 * 1000, skip: false }, function (suite) {

    suite.test('write_to_mongo', {timeout: 1000 * 1000, skip: false }, function (wtm_test) {

        wtm_test.test('report', {timeout: 1000 * 100, skip: false}, function (r_test) {

            var test_db =  'test_ico_346385';

            ico.model.init(test_db, function () {

                console.log('points 0 after linking');

                ico.model.Point().report(0, function (err, table) {
                    console.log(table);

                    console.log('points 2 after linking');

                    ico.model.Point().report(2, function (err, table) {
                        console.log(table);
                        ico.model.close();
                        r_test.end();
                    }, 30, 5);
                }, 10, 5);

            });

        });

        wtm_test.test('emit neighbors', {timeout: 1000 * 1000, skip: true }, function (emit_test) {

            var test_db = 'test_ico_' + Math.floor(Math.random() * 1000000);

            ico.model.init(test_db, function () {

                async.series([
                    function (callback) {
                        console.log('making points and faces')
                        ico.write_to_mongo.make_points_and_faces(callback, 0, 4);
                    },
                    function (callback) {
                        console.log('linking points')
                        ico.write_to_mongo.link_identical_points(callback, 0, 4);
                    },
                    function (callback) {
                        console.log('emitting neighbors')
                        ico.write_to_mongo.emit_neighbors(callback, 0, 4);
                    },
                    function (done) {
                        console.log('points 0 after neighbors')
                        ico.model.Point().report(0, function (err, table) {
                            console.log(table);
                            console.log('points 2 after neighbors');
                            ico.model.Point().report(2, function (err, table) {
                                console.log(table);
                                done();
                            }, 30, 5);
                        }, 10, 5);

                    }
                ], function () {
                    console.log('done rnning emit neighbors')
                    return emit_test.end();

                    ico.model.drop(function () {
                        emit_test.end();
                    });
                });
            });

        });
    });

    suite.end();
});