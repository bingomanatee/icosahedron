var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var _DEBUG = true;

/* ------------ CLOSURE --------------- */

/**
 * write the sector number to
 * @param sector
 * @param callback
 */
function write_sector_to_points(sector, callback) {
    var ico = require('./../../index.js');
    var Point = ico.model.Point();

    Point.find(
        {
            _id: {$in: sector.points}
        },
        function (err, points) {
            if (_DEBUG > 1) console.log('%s points found for sector %s', points ? points.length : 0, sector._id);
            if (err){
               console.log('error. ..... %s', err);
            }


            var gate = Gate.create();
            points.forEach(function (point) {
                if (!_.contains(point.sectors, sector.order)) {
                    point.sectors.push(sector.order);
                    point.markModified('sectors');
                    point.save(gate.latch());
                }
            });

            gate.await(callback);
        });
}

/** ********************
 * Purpose: To save sector membership,
 * NOTE: min_depth is ignored -- must generate in order
 */

function make_sectors(cb, min_depth, max_depth) {
    console.log('args: %s', util.inspect(_.toArray(arguments)));

    if (!_.isFunction(cb)) throw new Error('first argument to make_sectors must be function');

    var ico = require('./../../index.js');
    var Face = ico.model.Face();
    var Sector = ico.model.Sector();

    var sectors = [];

    var scripts = [
        function(callback){
            Sector.collection.drop(callback);
        },
        function (callback) {
            var gate = Gate.create();

            Face.find({detail: 0}).sort('order').exec(function (err, faces) {
                if (_DEBUG) console.log('faces at detail 0: ', faces.length);
                faces.forEach(function (face) {
                    var sector = new Sector(
                        {
                            order: face.order,
                            _id: Sector.sector_id(face.order, 0),
                            detail: 0,
                            points: [face.a_id, face.b_id, face.c_id]
                        }
                    );
                    sectors.push(sector);
                    sector.save(gate.latch());
                });

                gate.await(callback);
            })
        }

    ];

    scripts = scripts.concat(_.range(1, max_depth).map(function (detail) {
        return function (callback) {
            var new_sectors = [];

            var gate = Gate.create();

            sectors.forEach(function (sector) {
                var l = gate.latch();
                sector.make_child_sector(function (err, child) {
                    new_sectors.push(child);
                    l();
                })

            })

            gate.await(function () {
                sectors = new_sectors;
                callback();
            });
        }
    }));

    scripts = scripts.concat(_.range(0, max_depth).map(function (detail) {

        return function (callback) {
            console.log('making sector for detail %s', detail);
            Sector.find({detail: detail}, function (err, sectors) {
                if (err) console.log( err);

                var gate = Gate.create();

                console.log('sectors for %s: %s',detail,  sectors.length);

                sectors.forEach(function (sector) {
                    console.log('writing sector %s', sector._id);
                    write_sector_to_points(sector, gate.latch());
                });

                gate.await(callback);

            })

        };
    }));

    async.series(scripts, function(err, result){
        cb(err, result);
    });

}

/* -------------- EXPORT --------------- */

module.exports = make_sectors;