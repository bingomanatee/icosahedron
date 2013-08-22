var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Gate = require('gate');
var _DEBUG = false;

/* ------------ CLOSURE --------------- */

/**
 * write the sector number to
 * @param sector
 * @param callback
 */
function write_sector_to_points(sector, callback) {
    var ico = require('./../../index.js');
    var Point = ico.model.Point();

    if (_DEBUG) console.log('pushing points of sector %s(detail %s) : %s',
        sector.order,
        sector.detail,
        sector.points.join(',')
    );

    Point.find(
        {
            _id: {$in: sector.points}
        },
        function (err, points) {
            if (1 || _DEBUG) console.log('%s points found for sector %s (err %s) ', points ? points.length : 0, sector._id, err);
            var gate = Gate.create();
            points.forEach(function (point) {
                if (!_.contains(point.sectors, sector.order)) {
                    point.sectors.push(sector.order);
                    point.save(gate.latch());
                }

            });

            gate.await(function () {
                if (_DEBUG)  mongoose.set('debug', false);
                callback();
            });
        });
}

/** ********************
 * Purpose: To save sector membership,
 * NOTE: min_depth is ignored -- must generate in order
 */

function write_iso_data(cb, min_depth, max_depth) {
    if (!_.isFunction(cb)) throw new Error('first argument to write_iso_data must be function');

    var ico = require('./../../index.js');
    var Point = ico.model.Point();
    var Face = ico.model.Face();
    var Sector = ico.model.Sector();

    var sectors = [];

    var scripts = [
        function (callback) {
            var gate = Gate.create();

            Face.find({detail: 0}).sort('order').exec(function (err, faces) {

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

            Sector.find({detail: detail}, function (err, sectors) {

                var gate = Gate.create();

                sectors.forEach(function (sector) {
                    write_sector_to_points(sector, gate.latch());
                });

                gate.await(callback);

            })

        };
    }));

    scripts.push(

        function (callback) {
            var gate = Gate.create();

            _.range(0, max_depth).forEach(function (detail) {
                var t_latch = gate.latch();
                Point.report(detail, function (err, table) {
                    t_latch();
                }, 50, 10);
            });

            gate.await(callback);

        });


    async.series(scripts, cb);

}

/* -------------- EXPORT --------------- */

module.exports = write_iso_data;