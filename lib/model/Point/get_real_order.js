var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: to adjust the real order of the point
 */

function gre (cb) {
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

/* -------------- EXPORT --------------- */

module.exports = gre;