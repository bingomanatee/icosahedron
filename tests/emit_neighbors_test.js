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

var LIMIT = 5;

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

        var gate = Gate.create();

        var em_latch = gate.latch();

        ico.model.init(test_db, function () {

            wtm_test.test('emit neighbors', {timeout: 1000 * 1000, skip: false }, function (emit_test) {

                async.series([
                    function (callback) {
                        console.log('making points and faces')
                        ico.write_to_mongo.make_points_and_faces(callback, 0, LIMIT);
                    },
                    function (callback) {
                        console.log('linking points')
                        ico.write_to_mongo.link_identical_points(callback, 0, LIMIT);
                    },
                    function (callback) {
                        console.log('emitting neighbors')
                        ico.write_to_mongo.emit_neighbors(callback, 0, LIMIT);
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
                    console.log('done with emit neighbors')
                    em_latch();
                    emit_test.end();
                });
            });

            /**
             * this test allows you to re-read a dump repo for veracity after running the test once; set other tests to false.
             */
            wtm_test.test('report', {timeout: 1000 * 100, skip: true}, function (r_test) {

                var test_db = 'test_ico_346385';

                ico.model.init(test_db, function () {

                    console.log('points 0 after linking');

                    ico.model.Point().report(0, function (err, table) {
                        console.log(table);

                        console.log('points 1 after linking');

                        ico.model.Point().report(1, function (err, table) {
                            console.log(table);
                            r_test.end();
                        }, 30, 5);
                    }, 10, 5);

                });

            });


            gate.await(function () {

                wtm_test.test('distance of neighbors', {timeout: 1000 * 1000, skip: false}, function (d_test) {

                    var distance_data = [];

                    async.series(_.range(0, LIMIT).map(function (detail) {
                        return function (callback) {
                            console.log('checking distances for detail %s', detail);
                            var data = {};

                            var table_gate = Gate.create();

                            var stream = ico.model.Point().find({detail: detail}, {coords: 1, neighbors: 1}).stream();

                            stream.on('data', function (point) {
                                var l = table_gate.latch();
                                process.nextTick(function () {
                                    var dist = point.neighbors.map(function (n) {
                                        return _d2(point.coords, n.coords);
                                    });

                                    var info = {
                                        min: _.min(dist),
                                        max: _.max(dist)
                                    };
                                    info.range = info.max - info.min;

                                    d_test.ok(info.range < 0.1, 'point ' + point._id + ' neighbor distances are within 0.1 of each other');

                                    //  console.log('info for %s: %s', point._id, util.inspect(info));

                                    data [point._id] = info;
                                    l();
                                })
                            });

                            stream.on('error', function (err) {
                                console.log(err);
                                throw err;
                            });

                            stream.on('close', function () {
                                table_gate.await(function () {

                                    console.log('done with detail %s', detail);
                                    var table = new Table(
                                        {
                                            head: [
                                                'id', 'min', 'max', 'range'
                                            ],
                                            colWidths: [
                                                20, 10, 10, 10
                                            ],
                                            colAligns: [
                                                'left', 'right', 'right', 'right'
                                            ]
                                        });

                                    var min = 1, max = 0, range = 0;

                                    var count = _.values(data).length;
                                    var index = 0;
                                    _.each(data, function (info, id) {
                                        max = Math.max(info.max, max);
                                        min = Math.min(info.min, min);
                                        range = max - min;
                                        if (index < 20 || index > count - 5) {
                                            table.push([id, _n(info.min), _n(info.max), _n(info.range)]);
                                        }
                                        ++index;
                                    });

                                    table.push(['TOTAL', _n(min), _n(max), _n(range)]);

                                    console.log('data for detail', detail);
                                    console.log(table.toString());

                                    callback();
                                })
                            });
                        };

                    }), function () {
                        ico.model.close();
                        d_test.end();
                    });
                });
                wtm_test.end();
            });
        }); // end init
    });

});