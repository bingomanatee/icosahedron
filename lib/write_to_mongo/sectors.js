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


/* ------------ CLOSURE --------------- */

/**
 * write the sector number to
 * @param sector
 * @param callback
 */
function write_sector_to_points(sector, callback) {
    var ico = require('./../../index.js');
    var Point = ico.model.Point;

    if (_DEBUG)  mongoose.set('debug', true);

    if (_DEBUG) console.log('pushing points of sector %s(detail %s) : %s',
        sector.sector_number,
        sector.detail,
        sector.real_orders.join(',')
    );
    ico.model.Point.find(
        {
            detail: sector.detail,
            real_order: {$in: sector.real_orders}
        },
        function (err, points) {
            if (_DEBUG) console.log('%s points found for sector %s', points.length, sector._id);
            var gate = Gate.create();
            points.forEach(function (point) {
                if (!_.contains(point.sectors, sector.sector_number)) {
                    point.sectors.push(sector.sector_number);
                    point.save(gate.latch());
                }

            });

            gate.await(function () {
                if (_DEBUG)  mongoose.set('debug', false);
                callback();
            });
        });
}

/**
 * representing a single sector at a given detail
 *
 * @param sector_number {number}
 * @param detail {number}
 * @param pos [{number}] the real_order ids of the points in the sector
 * @constructor
 */
function Sector(sector_number, detail, pos) {
    this.sector_number = sector_number;
    this.point_orders = pos;
    this.detail = detail;
    this.points = [];
    this.child_scctor = null;
}

Sector.prototype = {

    get_points: function (cb) {
        var ico = require('./../../index.js');
        var Point = ico.model.Point;
        var self = this;
        Point.find({detail: this.detail, real_order: {$in: this.point_orders}},
            function (err, points) {
                self.points = points;
                cb();
            });
    },

    save: function (cb) {
        var self = this;
        ico.model.Sector.findById(this.sector_number + '.' + this.detail, function (err, old) {
            var sector;

            if (old) {
                sector = old;
            } else {
                sector = new ico.model.Sector();
                sector._id = self.sector_number + '.' + self.detail;
                sector.sector_number = self.sector_number;
            }

            sector.detail = self.detail;
            sector.real_orders = self.point_orders;
            sector.save(function (err, saved) {
                if (err) throw err;
                cb();
            });
        });
    },

    make_child_sector: function (cb) {
        var ico = require('./../../index.js');
        var Point = ico.model.Point;
        var self = this;

        var query = {detail: this.detail + 1, real_order: {$in: this.point_orders}};
        // console.log('query: %s', util.inspect(query));
        Point.find(query, 'ordered_neighbors', function (err, points_at_next_depth) {

            // console.log('result of %s:', util.inspect(query));
            // console.log(' .... %s', util.inspect(points_at_next_depth.map(function(pand){ return pand.ordered_neighbors})));
            var neighbor_real_orders = _.flatten(points_at_next_depth.map(function (point) {
                return point.ordered_neighbors;
            }));

            var counts = _.groupBy(neighbor_real_orders, _.identity);

            // console.log('neighbors of sector %s at level %s', self.sector_number, self.detail + 1, util.inspect(counts));
            var next_depth_real_orders = self.point_orders.slice();
            _.each(counts, function (pop, count) {
                if (pop.length > 1) {
                    next_depth_real_orders.push(pop[0]);
                }
            });

            next_depth_real_orders = _.sortBy(_.uniq(next_depth_real_orders), _.identity);
            self.child_sector = new Sector(self.sector_number, self.detail + 1, next_depth_real_orders);
            self.child_sector.save(function (err) {
                cb(err, self.child_sector);
            });
        });
    }

}
;

/** ********************
 * Purpose: To save sector membership,
 * NOTE: min_depth is ignored -- must generate in order
 */

function write_iso_data(cb, min_depth, max_depth) {
    if (!_.isFunction(cb)) throw new Error('first argument to write_iso_data must be function');

    var sectors = [];

    var scripts = [
        function (callback) {

            var gate = Gate.create();

            var iso = new THREE.IcosahedronGeometry(1, 0);
            iso.faces.forEach(function (face, i) {
                var sector = new Sector(i, 0, [face.a, face.b, face.c]);
                sectors.push(sector);
                sector.save(gate.latch());
            });

            gate.await(callback);
        }

    ];

    scripts = scripts.concat(_.range(1, max_depth).map(function (detail) {
        // console.log('making function for detail %s', detail);
        return function (callback) {
            // console.log('making children at detail %s', detail);
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
                // console.log('done at detail %s', detail);
                callback();
            });
        }
    }));

    _.range(0, max_depth).forEach(function (detail) {

        scripts.push(function (callback) {

            ico.model.Sector.find({detail: detail}, function (err, sectors) {

                console.log('found %s sectors for detail %s', sectors.length, detail);
                var gate = Gate.create();

                sectors.forEach(function (sector) {

                    write_sector_to_points(sector, gate.latch());

                });

                gate.await(callback);

            })

        });

    });
    scripts.push(

        function (callback) {
            var gate = Gate.create();

            _.range(0, max_depth).forEach(function (detail) {
                var t_latch = gate.latch();
                Point.report(detail, function (err, table) {
                    console.log("\n -------POINTS WITH SECTORS: --- detail %s --------- \n\n%s", detail, table);
                    t_latch();
                }, 50, 10);
            });

            gate.await(callback);

        });

    scripts.push(function (callback) {
        ico.model.close();
        callback();
    });


    async.series(scripts, cb);

}

/* -------------- EXPORT --------------- */

module.exports = write_iso_data;