var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Gate = require('gate');
var _DEBUG = false;
var humanize = require('humanize');

function _n(n){ return humanize.numberFormat(n, 3); }

function point(mongoose) {
    var schema = new mongoose.Schema(require('./Point.json'), {safe: true});

    schema.index({'coords.x': 1, 'coords.y': 1, 'coords.z': 1});
    schema.index({'detail': 1, order: 1});
    schema.index({ detail: 1, real_order: 1 });

    schema.methods.neighbor_ids = function () {
        if (!this.neighbors || (!this.neighbors.length)) {
            return 'none';
        }
        return this.neighbors.length + ': ' + _.pluck(this.neighbors, 'real_order').join(',');
    };

    schema.methods.get_parent = function (cb) {
        if (!this.parent) {
            console.log('no parent for node %s', self.parent);
            cb(null, null);
        } else {
            this.model('point').findById(this.parent, cb);
        }
    };

    schema.methods.get_child = function (cb) {
        if (!this.child) {
            cb(null, null);
        } else {
            this.model('point').findOne({_id: this.child}, cb);
        }
    };

    schema.methods.find_parent = function (cb) {
        this.model('point').findOne({
            'coords.x': this.coords.x,
            'coords.y': this.coords.y,
            'coords.z': this.coords.z,
            detail: this.detail - 1
        }).exec(cb);
    };

    schema.methods.find_child = function (cb) {
        this.model('point').findOne({
            'coords.x': this.coords.x,
            'coords.y': this.coords.y,
            'coords.z': this.coords.z,
            detail: this.detail + 1
        }).exec(cb);
    };

    schema.methods.link_to = function (other_points, cb) {
        if (!this.neighbors) {
            this.neighbors = [];
        }
        var self = this;
        if (_DEBUG)    console.log('linking point neighbors for point %s', self._id);

        if (!other_points.length) {
            if (_DEBUG)   console.log('done linking to for point %s', self._id);
            cb();
        } else {
            this.model('point').find({_id: {$in: _.pluck(other_points, '_id')}},
                {order: 1, real_order: 1, _id: 1},
                function (err, op_list) {
                    op_list.forEach(function (point) {
                        self.neighbors.push(point);
                    });
                    self.neighbors = _.uniq(self.neighbors, function (n) {
                        return n._id
                    });

                    self.model('point').update(
                        {_id: self._id},
                        { $push: { neighbors: {$each: self.neighbors} } },
                        cb
                    );

                });
        }
    };

    schema.methods.get_real_order = function (cb) {
        var self = this;
        if (this.detail == 0) {
            cb(null, this.order);
        } else if (this.parent) {
            this.get_parent(function (err, parent) {
                if (err) {
                    console.log('error getting parent %s for %s', self.parent, self._id);
                    throw err;
                }
                if (!parent) {
                    throw new Error(util.format('cannot get parent node %s', self.parent));
                }
                parent.get_real_order(cb);
            })
        } else {
            var model = this.model('point');
            if (!self.toJSON().hasOwnProperty('order')) throw new Error('cannot get_real_order without an order');

            model.find({detail: this.detail, parent: {$exists: true}})
                .count(function (err, parent_count) {
                    //  console.log('%s parent count: %s %s', self._id, err,  parent_count);
                    var s = self.toJSON();
                    var crit = {detail: self.detail, parent: {$exists: false}, order: {$lt: self.order}};
                    //  console.log('%s crit: %s', util.inspect(s), util.inspect(crit));

                    model.find(crit).count(function (err, nonparent_count) {
                        //  console.log('%s nonparent count: %s %s', self._id, err, nonparent_count);
                        cb(null, parent_count + nonparent_count);
                    })

                })
        }
    };

    schema.methods.set_real_order = function (real_order, cb, depth) {
        if (!depth) {
            if (_DEBUG)       console.log('INITIAL SPO: setting real order of %s to %s', this._id, real_order);
            depth = 0;
        } else {
            if (_DEBUG)      console.log(' ... setting real order of %s to %s (depth %s)', this._id, real_order, depth);
        }
        var self = this;
        this.real_order = real_order;
        this.save(function () {
            self.find_child(function (err, child) {
                if (child) {
                    child.set_real_order(real_order, cb, depth + 1);
                } else {
                    if (_DEBUG)         console.log('no child for %s', self._id);
                    cb();
                }

            })

        })
    };

    schema.statics.report = function (detail, callback, max_head, max_child) {
        var Table = require('cli-table');

        var Point = mongoose.model('point');

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

            callback(null, table.toString().replace(/[├──┼──┤]+\n/g, ''), n);
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

    var _pid = _.template('point_detail_<%= detail %>_order<%= order %>');
    schema.statics.point_id = function (detail, order) {
        return _pid({detail: detail, order: order});
    };

    return mongoose.model('point', schema);
}

module.exports = point;