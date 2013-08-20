IsoSphere reads and writes data from a THREE.js Icosahedron into and out of Mongo and JSON files.
It saves the point, face and sector data into independent records and unifies them into JSON collections.

It also breaks data for Icosahedron into 20 sectors based on the original faces and associates points
into these sectors.

## `point.index`, `point.order` and `point.real_order`

These three seemingly identical measurements are not ---  and its kind of funny why.

When Icosahedrons are created they are often created with duplicate points as they are subdivided.
Before identical points are removed, they are indexed, and this index is therefore saved to the point record, but is NOT
the same as its index in the vertices array.

Thankfully, this is not the value that `face.a`, `face.b`, `face.c` uses.
The true index of a point is saved by this module as a seperate field, `order`.

As for the `real_order` ....
Points in higher resolution Ico's are NOT identical to the same points in a given order. that is, point order=20 of
a res 3 Icosahedron is not the same as point order=20 of a res 2 polyhedron.
(the first 12 "seed" points seem the same but the rest are a crap shoot. )

This module's `link_identical_points` script sets a `real_order` field that ensures that every point of a given index
in any resolution Ico is the same. Of course not all Ico will have a point for a given index, but if it does,
it should have the same coordinates.

## Schema

The Schema for the registry information is stored in **lib/model/*.json** files.

## Point Schema

Point data has the following schema:

#### _id {String}

the id of the point based on its original order and level of detail. see the point_id static method of the Point class:
```
    'point_detail_<%= detail %>_order<%= order %>'
```

#### detail {posint}

the level of detail

#### order {posint}

the order the point is found in (see above).

#### real_order {Number}

the consistent identity of the point across all resolutions (see above).

#### parent {String}

the _id of the point one level higher in resolution. Not all points have parents.

#### child {String}

the _id of the point one level lower in resolution. Not all points have children
... because at some point you are at the highest resolution stored.

#### coords.x, coords.y, coords.z {float}

the 3D coordinates of the point; in -1...1.

#### uv.x, uv.y {float}

the 2D (UV) coordinates of the point in 0..1.

#### neighbors[].order, .real_order, _id

data on the points connected to the point

#### sectors [{posint}]

a number 0..19 indicating what sector (see below) the point belongs to.
Note that the first 12 (original) points will have five neighbors. All other points will have two (if on a border) or one sector.


