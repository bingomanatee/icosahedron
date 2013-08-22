var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Gate = require('gate');
var Table = require('cli-table');
var humanize = require('humanize');

/* ------------ CLOSURE --------------- */

var _DEBUG = false;
var PLACES = 8;

function _n(n) {
    return humanize.numberFormat(n, PLACES);
}


function _d2(a, b) {
    var xd = a.x - b.x;
    var yd = a.y - b.y;
    var zd = a.z - b.z;
    var out = Math.sqrt((xd * xd) + (yd * yd) + (zd * zd));

    return out;
}


var TABLE_CONFIG = {
    head: [
        'id',
        'x', 'y', 'z',
        'min', 'max', 'range'
    ],
    colWidths: [
        30,
        (5 + PLACES), (5 + PLACES), (5 + PLACES),
        (5 + PLACES), (5 + PLACES), (5 + PLACES)
    ],
    colAligns: [
        'left',
        'right', 'right', 'right',
        'right', 'right', 'right'
    ]
};

function _distance_info(point) {

    var dist = point.neighbors.map(function (n) {

        var out = _d2(point.coords, n.coords);

        if (_DEBUG)  console.log('distance between %s and %s: %s', point._id, n._id, out);

        return out;

    });

    var info = _.extend({
        min: _.min(dist),
        max: _.max(dist)
    }, _.clone(point.coords));
    info.range = info.max - info.min;
    return info;
}

/** ********************
 * Purpose: to report on the distance between point neighbors
 */

function _distance_data(Point, detail, callback) {

    var data = {};

    var gate = Gate.create();

    var stream = Point.find({detail: detail}, {coords: 1, neighbors: 1}).stream();

    stream.on('data', function (point) {
        var l = gate.latch();
        process.nextTick(function () {
            var info = _distance_info(point);
            data[point._id] = info;
            l();
        })
    });

    stream.on('error', function (err) {
        console.log(err);
        throw err;
    });

    stream.on('close', function () {
        gate.await(function () {
            callback(null, data);
        })
    });

}

function _distance_report(data) {

    var table = new Table(TABLE_CONFIG);

    var min = 2, max = 0, range = 0;

    var count = _.values(data).length;
    var index = 0;
    _.each(data, function (info, id) {
        if (_DEBUG) console.log('min: %s, max: %s, im: %s, imx: %s', info.min, info.max, min, max);
        max = Math.max(info.max, max);
        min = Math.min(info.min, min);
        table.push([id, _n(info.x), _n(info.y), _n(info.z),
            _n(info.min), _n(info.max), _n(info.range)]);
        ++index;
    });

    range = max - min;
    table.push(['TOTAL', '', '', '',
        _n(min), _n(max), _n(range)]);

    return table;
}

/* -------------- EXPORT --------------- */

module.exports = {
    dist_data: _distance_data,
    dist_report: _distance_report
};