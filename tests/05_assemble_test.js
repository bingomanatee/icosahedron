var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');

var ico = require('./../index.js');
var THREE = require('three');
var Gate = require('gate');
var K = 1000;
var _DEBUG = false;
var async = require('async');
var Table = require('cli-table');
var humanize = require('humanize');

var LIMIT = 2;

/** **************************************************
 * tests the creation and modification scripts
 *
 */

/** ************* CLOSURE ***********************
 *
 */

function _n(n) {
    return humanize.numberFormat(n, 4);
}

function _d2(a, b) {
    var xd = a.x - b.x;
    var yd = a.y - b.y;
    var zd = a.z - b.z;
    var out = Math.sqrt((xd * xd) + (yd * yd) + (zd * zd));

    return out;
}

var POINT_LENGTHS = [12, 42, 162, 642];

tap.test('ico', {timeout: 1000 * 1000, skip: false }, function (suite) {

    suite.test('pack mongo data', {timeout: 1000 * 1000, skip: false }, function (pack_test) {

        var test_db = 'test_ico_' + Math.floor(Math.random() * 1000000);
        //    test_db = 'test_ico_528723';

        ico.model.init(test_db, function () {

            pack_test.test('assemble', {timeout: 1000 * 1000, skip: false }, function (emit_test) {

                ico.write_to_mongo.assemble(0, LIMIT, function(){

                    var point_def_0 =
                    pack_test.end();

                });
            });


        }); // end init
    });

});