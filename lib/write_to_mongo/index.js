var make_points_and_faces = require('./make_points_and_faces');
var link_identical_points = require('./link_identical_points');
var emit_neighbors = require('./emit_neighbors.js');
var make_sectors = require('./make_sectors');
var pack = require('./pack.js');

var async = require('async');

module.exports = {
    make_points_and_faces: make_points_and_faces,
    link_identical_points: link_identical_points,
    emit_neighbors: emit_neighbors,
    make_sectors: make_sectors,
    pack: pack,

    scripts: [make_points_and_faces, link_identical_points, emit_neighbors, make_sectors, pack],

    script_names: 'make_points_and_faces,link_identical_points,emit_neighbors,make_sectors,pack'.split(','),

    assemble: function (min_detail, max_detail, callback) {

        var scripts = module.exports.scripts.map(function (script, i) {
            return (function (callback) {
                console.log('starting %s', module.exports.script_names[i]);
                script(function () {
                    console.log('completed %s', module.exports.script_names[i]);
                    callback();
                }, min_detail, max_detail);
            });
        });

        async.series(scripts, callback);

    }
}