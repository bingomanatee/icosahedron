var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var THREE = require('three');

var _DEBUG = false;

var DOC_CHUNKS = 5000;

/***********************************
 *  saves points and faces to mongo.
 *  Note, connection must be initialized.
 */

/* ------------ CLOSURE --------------- */

function save_faces(slice, cb) {

    var ico = require('./../../index.js');
    var Face = ico.model.Face();
    var gate = Gate.create();

    var latch = gate.latch();
    Face.create(slice, latch);

    gate.await(cb);
}


function save_points(slice, callback) {

    var ico = require('./../../index.js');
    var Point = ico.model.Point();
    Point.create(slice, function(err){
       if (err) {
           console.log('error creating %s: %s', util.inspect(slice.slice(0, 3)), err);
       }
       callback();
    });
}

/** ********************
 * Purpose: To save point data as a binary data for faster loading
 */

function write_iso_data(done, min_depth, max_depth) {
    if (!_.isFunction(done)) throw new Error('first argument to write_iso_data must be function');

    var scripts = [
        /**
         * Saving point data to mongo
         *
         * @param callback
         */
            function (callback) {
            var ico = require('./../../index.js');
            var Point = ico.model.Point();

            var gate = Gate.create();

            _.range(min_depth, max_depth)
                .forEach(function (detail) {
                    Point.remove({detail: detail}, function () {
                        var iso = new THREE.IcosahedronGeometry(1, detail);
                        if (_DEBUG) console.log('isos.points created iso with %s points for detail %s', iso.vertices.length, detail);

                        var completed = 0;
                        var percent = 0;

                        var worker = async.cargo(function (chunk, callback) {
                            if (_DEBUG) console.log('received an array of %s points for detail %s: ', chunk.length, detail);

                            save_points(chunk, function () {
                                completed += chunk.length;
                                var current_percent = Math.floor(completed * 100 / iso.vertices.length);
                                if ((detail < 3) || (current_percent > percent)) {
                                    percent = current_percent;
                                    if (_DEBUG) console.log('%s % points saved (%s of %s verts for detail %s)', percent, completed, iso.vertices.length, detail);
                                }

                                callback();
                            });
                        }, DOC_CHUNKS);

                        var stack = [];
                        iso.vertices.forEach(function (vertex, order) {

                            var vertex_data = {
                                _id: Point.point_id(detail, order),
                                type: 'point',
                                detail: detail,
                                index: vertex.index,
                                order: order,
                                coords: _.pick(vertex, 'x', 'y', 'z'),
                                uv: _.pick(vertex.uv, 'x', 'y')
                            };

                            stack.push(vertex_data);

                            if (stack.length > DOC_CHUNKS) {
                                if (_DEBUG) console.log('pushing %s points for detail %s', stack.length, detail);
                                worker.push(stack, gate.latch());
                                stack = [];
                            }
                        });

                        if (stack.length) {
                            if (_DEBUG) console.log('pushing final set of %s points for detail %s', stack.length, detail);
                            worker.push(stack, gate.latch());
                        }
                    })
                });

            gate.await(callback);
        },

        /**
         *
         * Saving face data to mongo
         *
         * @param callback
         */
            function (callback) {

            var ico = require('./../../index.js');
            var Point = ico.model.Point();
            var gate = Gate.create();

            _.range(min_depth, max_depth)
                .forEach(function (detail) {
                    var iso = new THREE.IcosahedronGeometry(1, detail);

                    var completed = 0;
                    var percent = 0;

                    var worker = async.cargo(function (chunk, callback) {

                        save_faces(chunk, function () {
                            completed += chunk.length;
                            var current_percent = Math.floor(completed * 100 / iso.faces.length);
                            if (current_percent > percent) {
                                percent = current_percent;
                                if (_DEBUG) console.log('%s % faces saved for detail %s', percent, detail);
                            }

                            callback();
                        });
                    }, DOC_CHUNKS);

                    var stack = [];

                    iso.faces.forEach(function (face, order) {
                        var face_data = {
                            _id: 'f' + order + 'd' + detail,
                            detail: detail,
                            order: order,
                            a_id: Point.point_id(detail, face.a),
                            a_order: face.a,
                            b_id: Point.point_id(detail, face.b),
                            b_order: face.b,
                            c_id: Point.point_id(detail, face.c),
                            c_order: face.c
                        };
                        stack.push(face_data);

                        if (stack.length > DOC_CHUNKS) {
                            worker.push(stack.slice(), gate.latch());
                            stack = [];
                        }
                    });

                    if (stack.length) {
                        worker.push(stack, gate.latch());
                    }

                });

            gate.await(callback);
        }
    ];

    async.series(scripts, function(){
        setTimeout(done, Math.pow(4, max_depth) * 50 );
    });

}

/* -------------- EXPORT --------------- */

module.exports = write_iso_data;