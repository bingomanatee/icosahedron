var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Table = require('cli-table');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: to generate a tabular listing of the point's data
 */

function report(detail, callback, max_head, max_child) {
    var ico = require('./../../../index.js');

    var Point = ico.model.Point();

    function _report(rows, n) {

        var table = new Table({
            head: [
                'id', 'order', 'r order',
                'x', 'y', 'z',
                'parent', 'neighbors', 'sectors'
            ],
            colWidths: [
                25, 8, 12,
                10, 10, 10,
                25, 40, 10
            ],
            colAligns: [
                'left', 'right', 'right',
                'right', 'right', 'right',
                'left', 'left', 'left'
            ]
        });

        rows.forEach(function (row) {
            var j = row.toJSON();
            table.push([row._id, row.order, row.real_order == 0 ? 0 : row.real_order || '??',
                _n(row.coords.x), _n(row.coords.y), _n(row.coords.z),
                j.hasOwnProperty('parent') ? j.parent : '--',
                j.hasOwnProperty('neighbors') ? row.neighbor_ids() : '--',
                j.hasOwnProperty('sectors') && j.sectors.length ? j.sectors.join(', ') : '--'
            ]);
        });

        callback(null, ico.util.squat(table), n);
    }

    if (!max_head) max_head = 30;
    if (!max_child) max_child = 5;

    Point.find({detail: detail}).count(function (err, n) {
        console.log('reporting  %s records (mh %s, mc %s', n, max_head, max_child);

        if ((!max_head) || ((max_head + max_child) >= n)) {
            console.log(' ... ALL rows reported');
            Point.find({detail: detail}).sort({order: 1}).exec(function (err, rows) {
                _report(rows, n);
            })
        } else {
            Point.find({detail: detail}).sort({order: 1}).limit(max_head).exec(function (err, rows) {
                if (max_child) Point.find({detail: detail})
                    .sort({order: 1})
                    .skip(n - max_child).limit(max_child)
                    .exec(function (err, child_rows) {
                        console.log(' ...  rows (%s / %s) reported', rows.length, child_rows.length);
                        _report(rows.concat(child_rows), n);
                    })
            })
        }
    });

};

/* -------------- EXPORT --------------- */

module.exports = report;