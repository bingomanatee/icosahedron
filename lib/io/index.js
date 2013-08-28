var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Parser = require('jsonparse');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose:
 * @return
 */

/* -------------- EXPORT --------------- */

module.exports = {

    faces: function (callback, depth) {
        var file_path = path.resolve(__dirname, util.format('../../planet_JSON/planet_%s_faces.json', depth));

        //console.log('file path: %s', file_path);
        var sent = false;
        fs.exists(file_path, function (e) {
            if (!e) {
                callback(new Error('cannot find ' + file_path));
            } else {
                var read_stream = fs.createReadStream(file_path);
                var p = new Parser();
                read_stream.on('data', function (data) {
                    p.write(data);
                })

                p.onValue = function (value) {
                    if (this.key == 'faces') {
                        sent = true;
                        callback(null, value);
                    }//console.log('value: %s', util.inspect(value));
                };

                read_stream.on('end', function () {
                    if (!sent) {
                        callback(new Error('cannot find points'));
                    }
                });
            }
        })
    },

    points: function (callback, depth, sector) {
        var file_path;

        if (arguments.length > 2) {
            file_path = path.resolve(__dirname, util.format('../../planet_JSON/planet_%s_points_sector_%s.json',
                depth, sector));
        } else {
            file_path = path.resolve(__dirname, util.format('../../planet_JSON/planet_%s_points.json', depth));
        }

        //console.log('file path: %s', file_path);
        var sent = false;
        fs.exists(file_path, function (e) {
            if (!e) {
                callback(new Error('cannot find ' + file_path));
            } else {
                var read_stream = fs.createReadStream(file_path);
                var p = new Parser();
                read_stream.on('data', function (data) {
                    p.write(data);
                })

                p.onValue = function (value) {
                    if (this.key == 'points') {
                        sent = true;
                        callback(null, value);
                    }//console.log('value: %s', util.inspect(value));
                };

                read_stream.on('end', function () {
                    if (!sent) {
                        callback(new Error('cannot find points'));
                    }
                });
            }
        })
    }

}