var _ = require('underscore');
var util = require('util');

module.exports = function (other_points, cb, _DEBUG) {
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