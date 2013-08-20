These tasks create a database of Planet points. These tasks do not relate to climate data, planet radius, etc;
just the basic geometries of a distributed planetary grid of xyz/uv points, split into 20 triangular sectors.

They should be run in this order:

1. make_points_and_faces -- create points and faces
2. link_identical_points -- order points to ensure that the real_order index always refers to the same point at each resolution
3. sectors -- group the points into 20 sectors
4.  pack -- save aggregate data into binary files

At some point these will be chained by design.