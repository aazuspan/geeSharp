// Load the sharpening library
var sharpening = require('users/aazuspan/geeSharpening:sharpening');

// Select an example area
var extent =
    ee.Geometry.Polygon(
        [[[-122.54129620668901, 47.33965367791073],
        [-122.54129620668901, 47.16837678723401],
        [-122.28912564394487, 47.16837678723401],
        [-122.28912564394487, 47.33965367791073]]], null, false);

// Select an example Landsat 8 TOA image
var img = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_047027_20160819")
    .clip(extent);

// Sharpen with Brovey using fixed band weights (optional)
var brov = sharpening.brovey.sharpen(img, "B4", "B3", "B2", "B5", "B8", 0.52, 0.25, 0.23);
// Sharpen with simple mean
var simpleMean = sharpening.simpleMean.sharpen(img, "B4", "B3", "B2", "B8");
// Sharpen with IHS
var ihs = sharpening.IHS.sharpen(img, "B4", "B3", "B2", "B8");
// Sharpen with PCA
var pca = sharpening.PCA.sharpen(img.select(["B2", "B3", "B4"]), img.select(["B8"]));


// Add layers to the map
Map.addLayer(img, { bands: ["B4", "B3", "B2"], min: 0, max: 0.4 }, "L8");
Map.addLayer(brov, { min: 0, max: 0.4 }, "Brovey")
Map.addLayer(simpleMean, { min: 0, max: 0.4 }, "SimpleMean")
Map.addLayer(ihs, { min: 0, max: 0.4 }, "IHS")
Map.addLayer(pca, { bands: ["B4", "B3", "B2"], min: 0, max: 0.4 }, "PCA")