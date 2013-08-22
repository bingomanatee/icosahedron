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

/** **************************************************
 * tests the creation and modification scripts
 *
 */

/** ************* CLOSURE ***********************
 *
 */
var POINT_LENGTHS = [12, 42, 162, 642]
function _point_test(detail, callback) {

    return function (point_test) {

        var base_poly = new THREE.IcosahedronGeometry(1, detail);
        ico.model.Point().find({detail: detail}).sort('order').exec(function (err, points) {
            point_test.equal(points.length, POINT_LENGTHS[detail], 'expected point count for detail ' + detail + ' is ' + POINT_LENGTHS[detail]);
            points.forEach(function (point, i) {
                var vertex = base_poly.vertices[i];
                if (_DEBUG)  console.log('vertex %s: %s, %s, %s ---- point %s : %s, %s, %s', vertex.index, vertex.x, vertex.y, vertex.z, i, point.coords.x, point.coords.y, point.coords.z);

                point_test.equal(point.coords.x, vertex.x, 'x of vertex ' + i + ' of poly detail ' + detail + ' should == point.');
                point_test.equal(point.coords.y, vertex.y, 'y of vertex ' + i + ' of poly detail ' + detail + ' should == point.');
                point_test.equal(point.coords.z, vertex.z, 'z of vertex ' + i + ' of poly detail ' + detail + ' should == point.');
            });

            callback();
            if (_DEBUG) console.log('done with point test %s', detail);
            point_test.end();
        });
    }

}

function _face_test(detail, callback) {
    return function (face_comp_test) {

        var base_poly = new THREE.IcosahedronGeometry(1, detail);

        ico.model.Point().find({detail: detail}, {order: 1}, function (err, points) {

            var ids = _.pluck(points, '_id');
            var order = _.pluck(points, '_order');
            var key = _.object(ids, order);

            ico.model.Face().find({detail: detail}).sort('order').exec(function (err, faces) {

                var poly_faces = _.sortBy(base_poly.faces, function (face) {
                    return (face.a_order * K * K) + (face.b_order * K) + face.c_order
                });

                faces.forEach(function (face, i) {
                    var poly_face = poly_faces[i];

                    if (_DEBUG && (i < 3)) {
                        console.log('........... face: %s', util.inspect(face));
                        console.log('........... poly_face: %s', util.inspect(poly_face));
                    }

                    face_comp_test.equal(poly_face.a, face.a_order, 'face a of ' + i + ' should == poly face');
                    face_comp_test.equal(poly_face.b, face.b_order, 'face b of ' + i + ' should == poly face');
                    face_comp_test.equal(poly_face.c, face.c_order, 'face c of ' + i + ' should == poly face');

                    //    face_comp_test.equal(face.a_order, key[face.a_id], 'face a id ' + face.a_id + ' has the right order.');
                    //  face_comp_test.equal(face.b_order, key[face.b_id], 'face a id ' + face.b_id + ' has the right order.');
                    //face_comp_test.equal(face.c_order, key[face.c_id], 'face a id ' + face.c_id + ' has the right order.');
                });

                callback();
                if (_DEBUG) console.log('done with face test %s', detail);
                face_comp_test.end();
            });
        })
    };
}

tap.test('ico', {timeout: 1000 * 1000, skip: false }, function (suite) {

    suite.test('write_to_mongo', {timeout: 1000 * 1000, skip: false }, function (wtm_test) {

        wtm_test.test('points and faces', {timeout: 1000 * 1000, skip: false }, function (ico_test) {

            var test_db = 'test_ico_' + Math.floor(Math.random() * 1000000);
            var gate = Gate.create();

            ico.model.init(test_db, function () {
                ico.write_to_mongo.make_points_and_faces(function () {
                    ico_test.test('compare points 0', _point_test(0, gate.latch()));

                    ico_test.test('compare points 1', _point_test(1, gate.latch()));

                    ico_test.test('compare faces 0', _face_test(0, gate.latch()));

                    ico_test.test('compare faces 1', _face_test(1, gate.latch()));

                    gate.await(function () {
                        return ico_test.end();

                        ico.model.drop(function () {
                            ico_test.end();
                        });
                    });


                }, 0, 2);
            });
        });
        wtm_test.end();

    });

    suite.end();

});