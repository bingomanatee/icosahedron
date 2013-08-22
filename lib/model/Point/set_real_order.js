

module.exports = function (real_order, cb, depth, _DEBUG) {
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