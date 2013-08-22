var make_points_and_faces = require('./make_points_and_faces');
var link_identical_points = require('./link_identical_points');
var emit_neighbors = require('./emit_neighbors.js');
var sectors = require('./sectors');
var eq_dist = require('./equalize_distances.js');
var pack = require('./pack');

var async = require('async');

module.exports = {
    make_points_and_faces: make_points_and_faces,
    link_identical_points: link_identical_points,
    emit_neighbors: emit_neighbors,
    sectors: sectors,
    eq_dist: eq_dist,
    pack: pack,

    scripts: [make_points_and_faces],

    assemble: function(min_detail, max_detail, callback){

        var scripts = [];
        module.exports.scripts.forEach(function(script, i){
            scripts.push(function(callback){
                console.log('calling script %s with range %s .. %s', i, min_detail, max_detail + 1);
                script(callback, min_detail, max_detail + 1);
            });
        });

        async.series(scripts, callback);

    }
}