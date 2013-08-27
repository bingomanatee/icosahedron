var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var THREE = require('three');
var _DEBUG = true;

var async = require('async');
var mongoose = require('mongoose');

var WRITE_ROOT = path.resolve(__dirname, '../../planet_JSON');

/* ------------ CLOSURE --------------- */

function save_detail(detail, sector) {
    var ico = require('./../../index.js');
    var Point = ico.model.Point();
    var Face = ico.model.Face();

    var by_sector = (arguments.length > 1);

    return function (callback) {
        var write_stream;

        var steps = [
            function (done) {
                if (_DEBUG) console.log('writing points %s', detail);
                var file_name, query;

                if (by_sector) {
                    file_name = util.format('planet_%s_points_sector_%s.json', detail, sector);
                    query = {detail: detail, sectors: sector};
                } else {
                    file_name = util.format('planet_%s_points.json', detail);
                    query = {detail: detail};
                }

                write_stream = fs.createWriteStream(path.resolve(WRITE_ROOT, file_name));
                write_stream.write('{"points": [');

                var stream = Point.find(query).sort({real_order: 1}).stream();
                var count = 0;

                stream.on('data', function (point) {
                    if (count > 0) {
                        write_stream.write(',');
                    }
                    ++count;
                    try {
                        var j = JSON.stringify(point.export_JSON(!by_sector));
                    } catch(err){
                        if (_DEBUG) console.log('error doing ej: %s', err);
                        throw err;
                    }
                    write_stream.write(j);
                });

                stream.on('error', function(err){
                    if (_DEBUG) console.log('STREAM ERROR err', err);
                });

                stream.on('close', function () {
                    if (_DEBUG) console.log('done writing points for %s, sector %s', detail, sector);
                    write_stream.end(']}', done);
                })

            }
        ];

        if ( !by_sector){
            steps.push(

                function (done) {
                    if (_DEBUG) console.log('writing faces %s, sector %s', detail, sector);
                    write_stream = fs.createWriteStream(path.resolve(WRITE_ROOT, util.format('planet_%s_faces.json', detail)));
                    write_stream.write('{"faces": [');

                    var stream = Face.find({detail: detail}).stream();
                    var count = 0;
                    var gate = Gate.create();

                    stream.on('data', function (face) {
                        var l = gate.latch();

                        face.export_JSON(function(err, points){

                            if (count > 0) {
                                write_stream.write(',');
                            }
                            ++count;

                            write_stream.write(JSON.stringify(points));
                            l();
                        })
                    });

                    stream.on('close', function () {
                        gate.await(function(){
                            if (_DEBUG) console.log('done writing faces for %s', detail);
                            write_stream.end(']}', done);
                        });
                    })

                }

            )
        }

        async.series(steps, callback);
    }
}


/** ********************
 * Purpose: Saves point and face data into JSON files.
 */

//@TODO: add sector saving

function pack(cb, min_depth, max_depth) {
    if (!_.isFunction(cb)) throw new Error('first argument to write_iso_data must be function');

    var scripts = [    ];

    _.range(min_depth, max_depth).forEach(function (depth) {
       _.range(0, 20).forEach(function (sector) { // save each sector
            scripts.push(save_detail(depth, sector));
        });
        scripts.push(save_detail(depth)); // save the planet as a whole
    });

    async.series(scripts, cb);

}

/* -------------- EXPORT --------------- */

module.exports = pack;