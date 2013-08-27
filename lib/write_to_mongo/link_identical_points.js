var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var THREE = require('three');
var _DEBUG = true;

var BATCH_SIZE = 500;

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: To save point data as a binary data for faster loading
 */

function like_identical_points(cb, min_detail, max_detail) {

    var ico = require('./../../index.js');
    var Point = ico.model.Point();
    var Face = ico.model.Face();

    if (!_.isFunction(cb)) throw new Error('first argument to like_identical_points must be function');

    var scripts = [

        /**
         * Assign parent and child relationships based on coordinates
         * @param callback
         */
            function (callback) {
            if (_DEBUG) console.log('setting parents parents');

            var point_stream = Point.find().sort({detail: 1, order: 1}).stream();
            var gate = Gate.create();
            point_stream.on('data', function (point) {
                var latch = gate.latch();
                point.find_parent(function (err, parent) {

                    if (parent) {
                        point.parent = parent._id;
                        point.save(function () {
                            parent.child = point._id;

                            parent.save(latch);
                        });
                    } else {
                        latch();
                    }
                })

            });

            point_stream.on('close', function () {
                if (_DEBUG) console.log('done setting parents');
                gate.await(callback);
            })
        }

    ];

    /**
     * Setting real order of each record
     * @param callback
     */
    (function () {

        _.range(min_detail, max_detail).forEach(function (detail) {

            scripts.push(function (callback) {

                var gate = Gate.create();

                if (_DEBUG)   console.log('setting real order of detail %s', detail);
                var done_latch = gate.latch();

                Point.find({detail: detail, parent: {$exists: true}}, {real_order: 1}).sort('-real_order').limit(1)
                    .exec(function (err, parents) {

                        var highest_parent = _.reduce(parents, function (out, p) {
                            return Math.max(out, p.real_order);
                        }, 0);
                        var real_order = highest_parent ? 1 + highest_parent : 0;
                        var stream = Point.find({detail: detail}).sort({order: 1}).stream();

                        stream.on('data', function (item) {
                            if (!item.parent) {
                                item.set_real_order(real_order, gate.latch());
                                ++real_order;
                            }
                        });

                        stream.on('close', function () {
                            if (real_order == 0) {
                                done_latch(new Error('no points found at detail %s', detail));
                            } else {
                                done_latch();
                            }
                        });

                        gate.await(function () {
                            if (_DEBUG)   console.log('set real order for all points at detail %s', detail);
                            callback();
                        });
                    });

            })
        });

    })();

    async.series(scripts, function () {
        if (_DEBUG) console.log('done with link_identical_points');
        cb();
    });

}

/* -------------- EXPORT --------------- */

module.exports = like_identical_points;