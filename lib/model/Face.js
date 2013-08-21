var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Gate = require('gate');

var ITER_COUNT = 500;

function point(mongoose) {
    var schema = new mongoose.Schema(require('./Face.json'));

    schema.methods.points = function (callback) {
        return this.model('point').find({ _id: {$in: [
            this.a_id, this.b_id, this.c_id
        ]} }, callback);
    };

    schema.methods.link_neighbors = function (callback) {

        var gate = Gate.create();

        this.points(function(err, points){
            points.forEach(function(point){
                point.link_to(_.reject(points, function(ppt){
                    return ppt._id == point._id;
                }), gate.latch());
            });
        });

        gate.await(callback);

    };

    var Face = mongoose.model('Face', schema);

    return Face;
}

module.exports = point;