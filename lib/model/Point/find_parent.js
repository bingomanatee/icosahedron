var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: find a point at the next depth that has the same coorddinates as this one.
 */

function find_parent(cb) {
        this.model('point').findOne({
            'coords.x': this.coords.x, 'coords.y': this.coords.y, 'coords.z': this.coords.z, detail: this.detail - 1
        }).exec(cb);

}

/* -------------- EXPORT --------------- */

module.exports = find_parent;