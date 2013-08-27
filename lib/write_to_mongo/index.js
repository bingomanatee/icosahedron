var make_points_and_faces = require('./make_points_and_faces');
var link_identical_points = require('./link_identical_points');
var emit_neighbors = require('./emit_neighbors.js');
var make_sectors = require('./make_sectors');
var pack = require('./pack.js');
var _ = require('underscore');
var async = require('async');

module.exports = {
    make_points_and_faces: make_points_and_faces,
    link_identical_points: link_identical_points,
    emit_neighbors: emit_neighbors,
    make_sectors: make_sectors,
    pack: pack,

    scripts: [make_points_and_faces, link_identical_points, emit_neighbors, make_sectors, pack],

    script_names: 'make_points_and_faces,link_identical_points,emit_neighbors,make_sectors,pack'.split(','),

    assemble: function (min_detail, max_detail, callback, start_from) {
        debugger;
        var names = module.exports.script_names;
        console.log('assemble, %s', names);
        var index = start_from ? _.indexOf(names, start_from) : 0;
        console.log('index: %s', index);
        if (index < 0) throw new Error('cannot find ' + start_from);

        var tasks = start_from ? module.exports.scripts.slice(index) : module.exports.scripts;

        console.log('%s scripts starting from %s', tasks.length, start_from);

        var scripts = tasks.map(function (script, i) {
            return (function (callback) {
                console.log('starting %s', module.exports.script_names[i + index]);
                script(function () {
                    console.log('completed %s', module.exports.script_names[i + index]);
                    callback();
                }, min_detail, max_detail);
            });
        });

        async.series(scripts, callback);

    }
}