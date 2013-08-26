var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Gate = require('gate');
var _DEBUG = false;

function neighbors(mongoose) {
    var schema = new mongoose.Schema(require('./Neighbor.json'));

    schema.methods.set_point_neighbors = function (done) {

        var ids = this.value.to;

        var Points = this.model('point');

        var self = this;

        Points.find({_id: {$in: ids}}, '-neighbors -uv', function(err, points){
            Points.update({_id: self._id}, {neighbors: points}, {safe: true}, function(){
                Points.findById(self._id, done)
            });
        });
    };

    return mongoose.model('Neighbors', schema);
}

module.exports = neighbors;