var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var THREE = require('three');
var mongoose = require('mongoose');

var _DEBUG = true;

var WRITE_ROOT = path.resolve(__dirname, '../../planet_JSON');
var FACE_CHUNKS = 2000;
var WRITE_SECTORS = true;

/* ------------ CLOSURE --------------- */

function write_mongo_to_file(write_stream, stream, done, detail, is_point){

    var count = 0;
    var gate = Gate.create();

    var worker = async.cargo(function (chunk, callback) {

        if (is_point){
            var out = chunk.reduce(function (out, item) {
                if (count > 0) {
                    out += ',';
                }
                out += JSON.stringify(item.export_JSON());
                ++count;
                return out;
            }, '');

            write_stream.write(out, callback);
        } else {
            if (count > 0){
                write_stream.write(',');
            }

            var out = [];

            async.parallel(chunk.map(function(face){
                return function(callback){
                    face.export_JSON(function(err, json){
                        out.push(JSON.stringify(json));
                        callback();
                    })
                }
            }), function(){
                write_stream.write(out.join(','), callback);
                ++count;
            });
        }
    }, FACE_CHUNKS);

    stream.on('data', function (record) {
        worker.push(record, gate.latch());
    });

    stream.on('close', function () {
        process.nextTick(function () {
            gate.await(function () {
                if (_DEBUG) console.log('done writing stream', count, detail);
                write_stream.end(']}', done);
            });
        })
    })
}


function save_detail(detail, sector) {
    var ico = require('./../../index.js');
    var Point = ico.model.Point();
    var Face = ico.model.Face();

    var by_sector = (arguments.length > 1);

    return function (callback) {
        var write_stream;

        var steps = [
            function (done) {
                if (_DEBUG) console.log('writing points %s for sector %s', detail, sector);
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

                write_mongo_to_file(write_stream, stream, done, detail, true);

            }
        ];

        if (!by_sector) {
            steps.push(

                function (done) {
                    if (_DEBUG) console.log('writing faces %s', detail);
                    write_stream = fs.createWriteStream(path.resolve(WRITE_ROOT, util.format('planet_%s_faces.json', detail)));
                    write_stream.write('{"faces": [');

                    var stream = Face.find({detail: detail}).stream();

                    write_mongo_to_file(write_stream, stream, done, detail);

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
        if (WRITE_SECTORS)  _.range(0, 20).forEach(function (sector) { // save each sector
            scripts.push(save_detail(depth, sector));
        });
        scripts.push(save_detail(depth)); // save the planet as a whole
    });

    async.series(scripts, cb);

}

/* -------------- EXPORT --------------- */

module.exports = pack;