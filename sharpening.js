/**
 * Sharpen the R, G, B, and NIR bands of an image using Brovey sharpening following Zhang & Roy 2016
 * @param {ee.Image} img An image to sharpen.
 * @param {string} redBand The label of the red band.
 * @param {string} greenBand The label of the green band.
 * @param {string} blueBand The label of the blue band.
 * @param {string} nirBand The label of the NIR band.
 * @param {string} pBand The label of the panchromatic band.
 * @param {number=} wRed The proportional weight of the red band.
 * @param {number=} wGreen The proportional weight of the green band.
 * @param {number=} wBlue The proportional weight of the blue band.
 * @return {ee.Image} An image with R, G, B, and NIR bands sharpened to the spatial 
 * resolution of the original panchromatic band.
*/
function sharpenBrovey(img, redBand, greenBand, blueBand, nirBand, pBand, wRed, wGreen, wBlue) {
    var p = img.select(pBand);
    var panProj = p.projection();

    // If any weights are missing, use equal weights
    if ([wRed, wGreen, wBlue].some(isMissing)) {
        wRed = 1 / 3;
        wGreen = 1 / 3;
        wBlue = 1 / 3;
    }

    // Calculate intensity band as sum of the weighted visible bands
    var intensity = calculateWeightedIntensity(img, redBand, greenBand, blueBand, wRed, wGreen, wBlue);
    // Resample the intensity band
    var intensitySharp = intensity.resample().reproject(panProj);

    var bands = [redBand, greenBand, blueBand, nirBand];
    var sharpBands = [];

    // Resample each band and inject pan spatial data
    for (var i = 0; i < bands.length; i++) {
        var band = img.select(bands[i]);
        var sharpBand = band.resample().reproject(panProj);
        sharpBand = sharpBand.divide(intensitySharp).multiply(p);

        sharpBands.push(sharpBand);
    }

    return (ee.Image(sharpBands).rename(["Rs", "Gs", "Bs", "NIRs"]));
}

/**
 * Sharpen the R, G, and B bands of an image using a simple mean.
 * @param {ee.Image} img An image to sharpen.
 * @param {string} redBand The label of the red band.
 * @param {string} greenBand The label of the green band.
 * @param {string} blueBand The label of the blue band.
 * @param {string} pBand The label of the panchromatic band.
 * @return {ee.Image} An image with R, G, and B bands sharpened to the spatial 
 * resolution of the original panchromatic band.
*/
function sharpenSimpleMean(img, redBand, greenBand, blueBand, pBand) {
    var p = img.select(pBand);
    var panProj = p.projection();

    var bands = [redBand, greenBand, blueBand];
    var sharpBands = [];

    for (var i = 0; i < bands.length; i++) {
        var band = img.select(bands[i]);

        var sharpBand = band.resample().reproject(panProj);
        sharpBand = sharpBand.add(p).multiply(0.5);

        sharpBands.push(sharpBand);
    }


    return (ee.Image(sharpBands).rename(["Rs", "Gs", "Bs"]));
}

/**
 * Sharpen the R, G, and B bands of an image using IHS.
 * @param {ee.Image} img An image to sharpen.
 * @param {string} redBand The label of the red band.
 * @param {string} greenBand The label of the green band.
 * @param {string} blueBand The label of the blue band.
 * @param {string} pBand The label of the panchromatic band.
 * @return {ee.Image} An image with R, G, and B bands sharpened to the spatial 
 * resolution of the original panchromatic band.
*/
function sharpenIHS(img, redBand, greenBand, blueBand, pBand) {
    var p = img.select(pBand);
    var imgHsv = img.select([redBand, greenBand, blueBand]).rgbToHsv();

    // Replace the value band with the pan band and convert back to RGB
    var imgRgb = imgHsv
        .addBands([p])
        .select(["hue", "saturation", pBand])
        .hsvToRgb();

    return imgRgb;
}

/**
 * Check if an object has a value. Helpful for finding missing arguments.
 * @param {object} x Any object 
 * @return {boolean} True if the object is missing, false if it is not.
*/
function isMissing(x) {
    if (x === undefined || x === null) {
        return true;
    }
    return false;
}

/**
 * Calculate an intensity band from the R, G, and B bands of an image with fixed band weights.
 * @param {ee.Image} img An image to sharpen.
 * @param {string} redBand The label of the red band.
 * @param {string} greenBand The label of the green band.
 * @param {string} blueBand The label of the blue band.
 * @param {number=} wRed The proportional weight of the red band.
 * @param {number=} wGreen The proportional weight of the green band.
 * @param {number=} wBlue The proportional weight of the blue band.
 * @return {ee.Image} A single band image representing the weighted intensity of the original image.
*/
function calculateWeightedIntensity(img, redBand, greenBand, blueBand, wRed, wGreen, wBlue) {
    // Calculate weighted bands
    var r = img.select(redBand).multiply(wRed);
    var g = img.select(greenBand).multiply(wGreen);
    var b = img.select(blueBand).multiply(wBlue);

    // Calculate intensity as sum of the weighted visible bands
    var intensity = r.add(g).add(b);

    return (intensity);
}


var l8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_TOA");

var extent =
    ee.Geometry.Polygon(
        [[[-120.21072699139526, 40.250178133772714],
        [-120.21072699139526, 40.13478482269844],
        [-120.05554510662964, 40.13478482269844],
        [-120.05554510662964, 40.250178133772714]]], null, false);

var img = l8
    .filterBounds(extent)
    .sort("CLOUD_COVER")
    .first()
    .clip(extent);

var brov = sharpenBrovey(img, "B4", "B3", "B2", "B5", "B8", 0.52, 0.25, 0.23);
var simpleMean = sharpenSimpleMean(img, "B4", "B3", "B2", "B8");
var ihs = sharpenIHS(img, "B4", "B3", "B2", "B8");

Map.addLayer(img, { min: 0, max: 0.5 }, "L8");
Map.addLayer(brov, { min: 0, max: 0.5 }, "Brovey");
Map.addLayer(simpleMean, { min: 0, max: 0.5 }, "SimpleMean");
Map.addLayer(ihs, { min: 0, max: 0.5 }, "IHS");