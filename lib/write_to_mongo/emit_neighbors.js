var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var THREE = require('three');

var DOC_CHUNKS = 5000;

/***********************************
 *  saves points and faces to mongo.
 *  Note, connection must be initialized.
 */

/* ------------ CLOSURE --------------- */


/** ********************
 * Purpose: To save point neighbor data
 */

function emit_neighbors(done, min_depth, max_depth, _DEBUG) {
    if (!_.isFunction(done)) throw new Error('first argument to emit_neighbors must be function');

    var ico = require('./../../index.js');

    var scripts = [

        function (callback) {

            function map() {

                emit(this.a_id, {detail: this.detail, to: [this.b_id]});
                emit(this.a_id, {detail: this.detail, to: [this.c_id]});

                emit(this.b_id, {detail: this.detail, to: [this.a_id]});
                emit(this.b_id, {detail: this.detail, to: [this.c_id]});

                emit(this.c_id, {detail: this.detail, to: [this.a_id]});
                emit(this.c_id, {detail: this.detail, to: [this.b_id]});

            }

            function reduce(key, values) {

                var out = {to: []};

                values.forEach(function (value, i) {
                    out.detail = value.detail;
                    if (value && value.to) {
                        out.to = out.to.concat(value.to);
                    }
                });

                return out;
            }

            function finalize(key, values) {
                var tto = {};

                var out = {to: [], detail: values.detail };
                values.to.forEach(function (t) {
                    tto[t] = 1;
                })

                for (t in tto) {
                    out.to.push(t);
                }
                out.count = out.to.length;
                return out;
            }

            var command = {
                mapreduce: "faces",
                map: map.toString(),
                reduce: reduce.toString(),
                finalize: finalize.toString(),
                query: {detail: {$gte: min_depth, $lt: max_depth}},
                out: {reduce: 'neighbors' }
            };

            ico.model.map_reduce(command, function(){
                process.nextTick(callback);
            });
        },

        function (done) {
            console.log('assigning neighbors to points');
            var count = 0;
            var Neighbor = ico.model.Neighbor();

            var query = {'value.detail': {$gte: min_depth, $lt: max_depth}};

            Neighbor.find(query).count(function (err, total) {
                console.log('neighbors at detail %s: %s', util.inspect(query), total);
                if (err) throw err;
                var neighbor_stream = Neighbor.find({'value.detail': {$gte: min_depth, $lt: max_depth}}).stream();
                var gate = Gate.create();

                neighbor_stream.on('data', function (n) {
                    var latch = gate.latch();
                    n.set_point_neighbors(function (err, npoint) {
                        if (_DEBUG || !(count % 100)) {
                            console.log('%s neighbors linked (%s neighbors for %s)',
                                count, npoint.neighbors.length, n._id);
                        }
                        ++count;
                        latch();
                    });
                });

                neighbor_stream.on('error', function (err) {
                    console.log('error: %s', err);
                    gate.abort = true;
                    done(err);
                });

                neighbor_stream.on('close', function () {
                    process.nextTick(function () {
                        if (_DEBUG) console.log('done with stream: %s found', count);
                        if (!gate.abort) gate.await(done);
                    });
                });
            })
        }
    ];

    async.series(scripts, function () {
        setTimeout(done, Math.pow(4, max_depth) * 50);
    });

}

/* -------------- EXPORT --------------- */

module.exports = emit_neighbors;