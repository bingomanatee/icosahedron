var ico = require('./index.js');

var min_depth = 0;
var max_depth = 7;
var reset = false;

var data = process.argv.slice(2);
if (data.length > 1) {
    min_depth = data[0];
    max_depth = data[1];
    reset = parseInt(data[2]);
}

console.log('running from min_depth %s to %s', min_depth, max_depth);

if (reset) {
    ico.model.init('ico', function () {
        ico.model.drop(function () {
            ico.model.init('ico', function () {
                ico.write_to_mongo.assemble(min_depth, max_depth, function () {
                    ico.model.close();
                })
            })
        })
    });
} else {
    ico.model.init('ico', function () {
        ico.write_to_mongo.assemble(min_depth, max_depth, function () {
            ico.model.close();
        })
    })
}