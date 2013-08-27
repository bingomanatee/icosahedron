var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Gate = require('gate');

var ITER_COUNT = 500;

var _SECTOR_ID_TEMPLATE = _.template('detail_<%= detail %>_order_<%= order %>');

function sector(mongoose) {
    var schema = new mongoose.Schema(require('./Sector.json'));

    schema.statics.sector_id = function(order, detail){
        return _SECTOR_ID_TEMPLATE({order: order, detail: detail});
    }

    schema.methods.make_child_sector = function (cb) {

        var Point = require('./index.js').Point();
        var Sector = this.model('sector');
        var self = this;

        var query = {parent: {$in: this.points}};

        Point.find(query, function (err, points_at_next_depth) {

            var neighbors = _.flatten(points_at_next_depth.map(function (point) {
                return point.neighbors;
            }));

            var next_sector_ids = _.pluck(points_at_next_depth, '_id');

            var counts = _.groupBy(neighbors, '_id');

            _.each(counts, function (points, _id) {
                if (points.length > 1) {
                    next_sector_ids.push(_id);
                }
            });
            var detail = self.detail + 1;

            self.child_sector = new Sector(
                {
                    _id: Sector.sector_id(self.order, detail),
                    order: self.order,
                    detail: detail,
                    points: next_sector_ids
                }
            );
            self.child_sector.save(cb);
        });
    };

    var Sector = mongoose.model('sector', schema);

    return Sector;
}

module.exports = sector;