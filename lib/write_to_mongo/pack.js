var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var THREE = require('three');
var _DEBUG = false;

var async = require('async');
var mongoose = require('mongoose');

var WRITE_ROOT = path.resolve(__dirname, '../../planet_JSON');

/* ------------ CLOSURE --------------- */

function save_detail(detail, sector) {

    var by_sector = (arguments.length > 1);

    return function (callback) {
        console.log('writing detail %s, sector %s', detail, sector);

        var write_stream;

        var steps = [
            function (done) {
                var ico = require('./../../index.js');
                var Point = ico.model.Point;
                console.log('writing points %s, sector %s', detail, sector);
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

                var stream = Point.find(query).sort('real_order').stream();
                var count = 0;

                stream.on('data', function (point) {
                    if (count > 0) {
                        write_stream.write(',');
                    }
                    ++count;

                    write_stream.write(JSON.stringify(point.toJSON()));
                });

                stream.on('end', function () {
                    console.log('done writing points for %s, sector %s', detail, sector);
                    write_stream.end(']}', done);
                })

            },

            function (done) {
                console.log('writing faces %s, sector %s', detail, sector);
                write_stream = fs.createWriteStream(path.resolve(WRITE_ROOT, util.format('planet_%s_faces.json', detail)));
                write_stream.write('{"faces": [');

                var stream = Face.find({detail: detail}).stream();
                var count = 0;

                stream.on('data', function (face) {
                    if (count > 0) {
                        write_stream.write(',');
                    }
                    ++count;

                    write_stream.write(JSON.stringify(face.toJSON()));
                });

                stream.on('end', function () {
                    console.log('done writing faces for %s, sector %s', detail, sector);
                    write_stream.end(']}', done);
                })

            }
        ];

        async.series(steps, callback);
    }
}


/** ********************
 * Purpose: To save sector membership
 */

function pack(cb, min_depth, max_depth) {
    if (!_.isFunction(cb)) throw new Error('first argument to write_iso_data must be function');


    var scripts = [    ];

    _.range(min_depth, max_depth).forEach(function (depth) {
        scripts.push(save_detail(depth));
        _.range(0, 20).forEach(function (sector) {
            scripts.push(save_detail(depth, sector));
        });
    });

    scripts.push(
        function (callback) {
            ico.model.close();
            callback();
        });

    async.series(scripts, cb);

}

/* -------------- EXPORT --------------- */

module.exports = pack;