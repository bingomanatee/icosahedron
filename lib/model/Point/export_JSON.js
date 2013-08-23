var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: to export data for embedding
 */

function export_JSON(save_sector) {
    var out = {
        ro: this.real_order,
        c: [this.coords.x, this.coords.y, this.coords.z],
        uv: [this.uv.x, this.uv.y],
        n: _.pluck(this.neighbors,'real_order')
    };

    if (save_sector) {
        out.s = this.sectors.slice();
    }

    return out;
}

/* -------------- EXPORT --------------- */

module.exports = export_JSON;