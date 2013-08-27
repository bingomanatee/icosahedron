var ico = require('./index.js');
var util = require('util');

var min_depth = 0;
var max_depth = 7;
var reset = false;

var data = process.argv.slice(2);
if (data.length > 1) {
    min_depth = parseInt(data[0]);
    max_depth = parseInt( data[1]);
}
var start_from = 'make_points_and_faces';

if (data.length > 2){
    start_from = data[2]
}

console.log('running from min_depth %s to %s -- start from %s', min_depth, max_depth, start_from);

var conn = require('./conn.json');
console.log(util.inspect(conn));
var db = conn.db_local;

if (reset) {
    ico.model.init(db, function () {
        ico.model.drop(function () {
            ico.model.init(db, function () {
                ico.write_to_mongo.assemble(min_depth, max_depth, function () {
                    ico.model.close();
                }, start_from);
            })
        })
    });
} else {
    ico.model.init(db, function () {
        ico.write_to_mongo.assemble(min_depth, max_depth, function () {
            ico.model.close();
        }, start_from);
    })
}