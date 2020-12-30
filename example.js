// Load the sharpening functions
var sharpening = require("users/aazuspan/geeSharp:sharpening.js");

// Select an example area
var extent = ee.Geometry.Polygon(
  [
    [
      [-122.54129620668901, 47.33965367791073],
      [-122.54129620668901, 47.16837678723401],
      [-122.28912564394487, 47.16837678723401],
      [-122.28912564394487, 47.33965367791073],
    ],
  ],
  null,
  false
);

Map.centerObject(extent);

// Select an example Landsat 8 TOA image
var img = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_047027_20160819").clip(extent);

var vis = img.select(["B4", "B3", "B2"]);
var pan = img.select(["B8"]);

// Sharpen with Brovey using fixed band weights (optional)
var brov = sharpening.brovey.sharpen(vis, pan, [0.52, 0.25, 0.23]);
// Sharpen with simple mean
var simpleMean = sharpening.simpleMean.sharpen(vis, pan);
// Sharpen with additive high-pass filter
var HPFA = sharpening.HPFA.sharpen(vis, pan);
// Sharpen with IHS
var ihs = sharpening.IHS.sharpen(vis, pan);
// Sharpen with PCA. Note that the pan band may need to be inverted
// based on the order of the input bands when using PCA.
var pca = sharpening.PCA.sharpen(vis, pan.multiply(-1));
// Sharpen with Gram-Schmidt
var gs = sharpening.GS.sharpen(vis, pan);

// Add layers to the map
Map.addLayer(vis, { min: 0, max: 0.4 }, "L8");
Map.addLayer(brov, { min: 0, max: 0.4 }, "Brovey");
Map.addLayer(simpleMean, { min: 0, max: 0.4 }, "SimpleMean");
Map.addLayer(HPFA, { min: 0, max: 0.4 }, "HPFA");
Map.addLayer(ihs, { min: 0, max: 0.4 }, "IHS");
Map.addLayer(pca, { min: 0, max: 0.4 }, "PCA");
Map.addLayer(gs, { min: 0, max: 0.4 }, "Gram-Schmidt");

// Load the image quality functions
var quality = require("users/aazuspan/geeSharp:quality.js");

// Calculate quality indexes to quantify distortion in the GS sharpened image
var gsQ = quality.Q.calculate(vis, gs);
var gsRASE = quality.RASE.calculate(vis, gs);
var gsERGAS = quality.ERGAS.calculate(vis, gs);

print(gsQ, gsRASE, gsERGAS);
