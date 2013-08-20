var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var THREE = require('three');
var _DEBUG = false;

var BATCH_SIZE = 500;

/* ------------ CLOSURE --------------- */

function find_real_neighbors(point, cb) {
    var ico = require('./../../index.js');
    var Point = ico.model.Point;

    Point.find({detail: point.detail, order: {$in: point.neighbors}}, 'real_order', function (err, neighbors) {
        var real_neighbors = neighbors.filter(function (n) {
            return !(isNaN(n.real_order))
        }).map(function (n) {
                return n.real_order;
            });

        if (_DEBUG) console.log('real neighbors of %s based on %s is %s', point._id, point.neighbors.join(','), real_neighbors.join(','));
        point.ordered_neighbors = real_neighbors;
        point.markModified('ordered_neighbors');
        point.save(cb);
    });
}

/** ********************
 * Purpose: To save point data as a binary data for faster loading
 */

function write_iso_data(cb, min_detail, max_detail) {

    var ico = require('./../../index.js');
    var Point = ico.model.Point();
    var Face = ico.model.Face();

    if (!_.isFunction(cb)) throw new Error('first argument to write_iso_data must be function');

    var scripts = [

        /**
         * Assign parent and child relationships based on coordinates
         * @param callback
         */
            function (callback) {
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

             if(_DEBUG)   console.log('setting real order of detail %s', detail);
                var done_latch = gate.latch();

                Point.find({detail: detail, parent: {$exists: true}}, {real_order: 1}).sort('-real_order').limit(1)
                    .exec(function (err, parents) {

                        var highest_parent = _.reduce(parents, function(out, p){
                            return Math.max(out, p.real_order);
                        }, 0);
                        var real_order = highest_parent ? 1 + highest_parent : 0;
                        if(_DEBUG)    console.log('highest parent at detail %s is %s', detail, real_order);
                        var stream = Point.find({detail: detail}).sort({order: 1}).stream();

                        stream.on('data', function (item) {
                            if (!item.parent){

                                if (real_order > 160){
                                    console.log('real order set to %s', real_order);
                                }
                                item.set_real_order(real_order, gate.latch());
                                ++real_order;
                            }
                        });

                        stream.on('close', function () {
                            if (real_order == 0){
                                if(_DEBUG)   console.log(' ............ no points found at detail %s', 0);
                                done_latch( new Error('no points found at detail %s', detail));
                            } else {
                                if(_DEBUG)  console.log(' .. DONE (starting to) set real order of detail %s', detail);
                                done_latch();
                            }
                        });

                        gate.await(function () {
                            if(_DEBUG)   console.log('set real order for all points at detail %s', detail);
                            callback();
                        });
                    });

            })
        });

    })();

    /**
     * Setting neighbors
     * @param callback
     *
     function (callback) {
        var gate = Gate.create();

        _.range(min_detail, max_detail).forEach(function (detail) {
            console.log('setting neighbors of detail %s', detail);

            var face_stream = Face.find({detail: detail}).stream();

            face_stream.on('data', function (face) {
                var latch = gate.latch();
                console.log('setting neighbors based on face %s', face._id);

                face.link_neighbors(function () {
                    console.log('done setting neighbors of %s', face._id);
                    latch();
                });

            })

            face_stream.on('end', function () {
                console.log('done setting neighbors of detail %s', detail);
                gate.await(callback);
            });

        });

        gate.await(callback);
    }
     */
    async.series(scripts, cb);

}

/* -------------- EXPORT --------------- */

module.exports = write_iso_data;