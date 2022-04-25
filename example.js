/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var extent = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-122.54129620668901, 47.33965367791073],
          [-122.5406095611812, 47.19777788465757],
          [-122.28981228945268, 47.20011060767077],
          [-122.28912564394487, 47.33965367791073]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// Load the sharpening functions
var sharpening = require("users/aazuspan/geeSharp:sharpening.js");

// Zoom in on an example area
Map.centerObject(extent, 15);

// Select an example Landsat 8 TOA image
var img = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_047027_20160819").clip(extent);

// Select the bands to sharpen--in this case, the visible bands.
var vis = img.select(["B4", "B3", "B2"]);
// Select the panchromatic band to use for sharpening.
var pan = img.select(["B8"]);


// Sharpen with Smoothing Filter-based Intensity Modulation
var sfim = sharpening.SFIM.sharpen(vis, pan);

// Add layers to the map
Map.addLayer(vis, { min: 0, max: 0.4 }, "Unsharpened");
Map.addLayer(sfim, { min: 0, max: 0.4 }, "Sharpened (SFIM)");