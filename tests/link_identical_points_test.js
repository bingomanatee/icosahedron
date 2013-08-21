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
        wtm_test.test('points and faces', {timeout: 1000 * 1000, skip: false }, function (link_test) {

            var test_db = 'test_ico_' + Math.floor(Math.random() * 1000000);
            var gate = Gate.create();

            ico.model.init(test_db, function () {

                async.series([
                    function (callback) {
                        ico.write_to_mongo.make_points_and_faces(callback, 0, 3);
                    },
                    function (callback) {
                        //  ico.model.debug();
                        ico.write_to_mongo.link_identical_points(callback, 0, 3);
                    }
                ], function () {

                    var gate = Gate.create();

                    var count_latch = gate.latch();
                    link_test.test('count of points', function (count_test) {

                        ico.model.Point().find({}).count(function (err, c) {
                            count_test.equal(c, COUNT, 'has points');
                            count_latch();
                            count_test.end();
                        });

                    });


                    var serial_latch = gate.latch();

                    link_test.test('real_order is serial', function (serial) {

                        async.parallel(

                            _.range(0, 3).map(function (detail) {
                                return function (callback) {

                                    ico.model.Point().find({detail: detail}, {real_order: 1}).sort('real_order').exec(function (err, points) {

                                        var orders = _.pluck(points, 'real_order');

                                        serial.deepEqual(orders, _.range(0, orders.length), 'points are in order at detail ' + detail);
                                        callback();
                                    });
                                };
                            }), function () {

                                serial_latch();
                                serial.end();
                            }
                        );

                    });

                    var equal_latch = gate.latch();

                    link_test.test('all points are equal', function (equal_test) {
                        var eq_gate = Gate.create();

                        _.range(0, POINT_LENGTHS[2]).forEach(function (num) {
                            var latch = eq_gate.latch();

                            ico.model.Point().find({real_order: num}, function (err, points) {
                                equal_test.ok(points.length > 0, 'there are points with real_order ' + num);
                                if (points.length > 1) {
                                    var base = points.shift();
                                    var x = base.coords.x;
                                    var y = base.coords.y;
                                    var z = base.coords.z;
                                    points.forEach(function (p) {
                                        equal_test.equal(x, p.coords.x, 'x of ' + p._id + ' is equal to  ' + base._id);
                                        equal_test.equal(y, p.coords.y, 'y of ' + p._id + ' is equal to  ' + base._id);
                                        equal_test.equal(z, p.coords.z, 'z of ' + p._id + ' is equal to  ' + base._id);
                                    });
                                }
                                latch();
                            });

                        });

                        eq_gate.await(function () {
                            equal_latch();
                            equal_test.end();
                        })

                    });

                    var report_latch = gate.latch();
                    link_test.test('report of points', function (report_test) {
                        console.log('points 0 after linking');

                        ico.model.Point().report(0, function (err, table) {
                            console.log(table);

                            console.log('points 2 after linking');

                            ico.model.Point().report(2, function (err, table) {
                                console.log(table);
                                //  return link_test.end();
                                report_latch();
                                report_test.end();
                            }, 30, 5);
                        }, 10, 5);

                    });


                    gate.await(function () {
                        return;
                        ico.model.drop(function () {
                        });
                    });

                    link_test.end();
                })
            });
        });

    });

    suite.end();

})
;