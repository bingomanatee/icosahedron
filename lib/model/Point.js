var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Gate = require('gate');
var _DEBUG = false;
var humanize = require('humanize');

function _n(n) {
    return humanize.numberFormat(n, 3);
}

var _POINT_ID_TEMPLATE = _.template('point_detail_<%= detail %>_order<%= order %>');

function point(mongoose) {
    var schema = new mongoose.Schema(require('./Point.json'), {safe: true});

    schema.index({'coords.x': 1, 'coords.y': 1, 'coords.z': 1});
    schema.index({ detail: 1, order: 1});
    schema.index({ detail: 1, real_order: 1 });

    schema.methods.neighbor_ids = function () {
        if (!this.neighbors || (!this.neighbors.length)) {
            return 'none';
        }
        return this.neighbors.length + ': ' + _.pluck(this.neighbors, 'real_order').join(',');
    };

    schema.methods.get_parent = function (cb) {
        if (this.parent) {
            this.model('point').findById(this.parent, cb);
        } else {
            cb(null, null);
        }
    };

    schema.methods.get_child = function (cb) {
        if (this.child) {
            this.model('point').findOne({_id: this.child}, cb);
        } else {
            cb(null, null);
        }
    };

    schema.methods.find_parent = function (cb) {
        this.model('point').findOne({
            'coords.x': this.coords.x, 'coords.y': this.coords.y, 'coords.z': this.coords.z, detail: this.detail - 1
        }).exec(cb);
    };

    schema.methods.find_child = function (cb) {
        this.model('point').findOne({
            'coords.x': this.coords.x, 'coords.y': this.coords.y, 'coords.z': this.coords.z, detail: this.detail + 1
        }).exec(cb);
    };

    schema.methods.link_to = require('./Point/link_to');

    schema.methods.get_real_order = require('./Point/get_real_order');

    schema.methods.set_real_order = require('./Point/set_real_order');

    schema.statics.report = require('./Point/report');

    schema.statics.point_id = function (detail, order) {
        return _POINT_ID_TEMPLATE({detail: detail, order: order});
    };

    return mongoose.model('point', schema);
}

module.exports = point;