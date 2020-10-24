/**
 * Rescale an image band to be more similar to a target band. Implemented based
 * on the SAGA GIS source code. 
 * https://github.com/saga-gis/saga-gis/blob/master/saga-gis/src/tools/imagery/imagery_tools/pansharpening.cpp
 * @param {ee.Image} targetBand A single-band image to rescale.
 * @param {ee.Image} referenceBand A single-band image to rescale the targetBand towards.
 * @param {boolean} match If true, the mean and standard deviation of the 
 *  targetBand will be matched to the reference band. If false, the range
 *  will be matched.
 * @return {ee.Image} A rescaled version of inputBand.
*/
function rescaleBand(targetBand, referenceBand, match) {
    var offsetTarget,
        offset,
        scale;

    if (match === false) {
        offsetTarget = reduceImage(targetBand, ee.Reducer.min());
        offset = reduceImage(referenceBand, ee.Reducer.min());
        scale = getImageRange(referenceBand).divide(getImageRange(targetBand));
    }

    else {
        offsetTarget = reduceImage(targetBand, ee.Reducer.mean());
        offset = reduceImage(referenceBand, ee.Reducer.mean());
        scale = reduceImage(referenceBand, ee.Reducer.stdDev())
            .divide(reduceImage(targetBand, ee.Reducer.stdDev()));
    }

    var rescaledTarget = targetBand.subtract(offsetTarget).multiply(scale).add(offset);
    return rescaledTarget;
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
 * Create a constant image where each band represents the reduced value of the
 * corresponding band of the input image.
 * @param {ee.Image} img The input image to calculate reduced values for.
 * @param {ee.Reducer} reducer The reducer to apply to the image, such as ee.Reducer.min()
 * @return {ee.Image} An image with the same number of bands as the input
 *  image, where each band is a constant value of the reduced value of the 
 *  corresponding band of the input image.
*/
function reduceImage(img, reducer) {
    // Calculate the reduced image value(s)
    var imgReducedVal = img.reduceRegion({
        reducer: reducer,
        geometry: img.geometry(),
        scale: img.projection().nominalScale(),
        maxPixels: 1e9
    });

    var imgReduced = ee.Image.constant(imgReducedVal.values(img.bandNames()));
    return imgReduced;
}

/**
 * Create a constant image where each band represents the range value of the
 * corresponding band of the input image.
 * @param {ee.Image} img The input image to calculate range values for.
 * @return {ee.Image} An image with the same number of bands as the input
 *  image, where each band is a constant value of the range value of the 
 *  corresponding band of the input image.
*/
function getImageRange(img) {
    var imgMax = reduceImage(img, ee.Reducer.max());
    var imgMin = reduceImage(img, ee.Reducer.min());
    var imgRange = imgMax.subtract(imgMin);
    return imgRange;
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

    return intensity;
}

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

    return ee.Image(sharpBands).rename(["Rs", "Gs", "Bs", "NIRs"]);
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


    return ee.Image(sharpBands).rename(["Rs", "Gs", "Bs"]);
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
 * Sharpen all bands of an image by converting it to principal components,
 * rescaling a panchromatic band to match the first principal component,
 * swapping the high-resolution panchromatic band for the first principal
 * component, and inverting the transformation to create a high-resolution
 * multispectral image.
 * @param {ee.Image} img An image to sharpen.
 * @param {ee.Image} pBand An single-band panchromatic image.
 * @param {number} substitutePC The number of the principal component to
 *  replace with the pan band. Defaults to 1. Must be in range 1 - n,
 *  where n is the number of bands in the input image.
 * @param {boolean} matchPan If true, the mean and standard deviation of
 *  the pan band will be matched to the mean and standard deviation of the
 *  substituted PC. If false, the range will be matched instead. Defaults
 *  to true.
 * @return {ee.Image} An image sharpened to the spatial resolution of the 
 * panchromatic image.
*/
function sharpenPCA(img, pan, substitutePC, matchPan) {
    // Default to substituting the first PC
    if (isMissing(substitutePC)) {
        substitutePC = 1;
    }
    // Default to matching mean and standared deviation of the pan band
    if (isMissing(matchPan)) {
        matchPan = true;
    }

    // Resample the image to the panchromatic resolution
    img = img.resample("bilinear")
    img = img.reproject(pan.projection())

    // Store band names for future use
    var bandNames = img.bandNames();
    var panBand = pan.bandNames().get(0);

    // Mean-center the images to allow efficient covariance calculation
    var imgMean = reduceImage(img, ee.Reducer.mean());

    var imgCentered = img.subtract(imgMean);

    // Convert image to 1D array
    var imgArray = imgCentered.toArray();

    // Calculate a covariance matrix between all bands
    var covar = imgArray.reduceRegion({
        reducer: ee.Reducer.centeredCovariance(),
        geometry: imgCentered.geometry(),
        scale: imgCentered.projection().nominalScale(),
        maxPixels: 1e9
    });

    // Pull out the covariance results as an array
    var covarArray = ee.Array(covar.get("array"));

    // Calculate eigenvalues and eigenvectors
    var eigens = covarArray.eigen();

    // Pull out eigenvectors (elements after eigenvalues in each list) [7x7]
    var eigenVectors = eigens.slice(1, 1);

    // Convert image to 2D array
    var imgArray2d = imgArray.toArray(1);

    // Build the names of the principal component bands  
    var pcSeq = ee.List.sequence(1, bandNames.length());
    var pcNames = pcSeq.map(function (x) {
        return ee.String("PC").cat(ee.Number(x).int());
    });

    var principalComponents = ee.Image(eigenVectors)
        .matrixMultiply(imgArray2d)
        // Flatten unnecessary dimension
        .arrayProject([0])
        // Split into a multiband image
        .arrayFlatten([pcNames]);

    // I'm not sure why this is required. I haven't seen anything about
    // inverting the pan band in the literature. But if this isn't done,
    // lighting is reversed. If you compare the first PC with the pan,
    // you'll notice that their lighting looks reversed, which is the
    // only reason I tried this.
    pan = pan.multiply(-1)

    // Rescale the pan band to more closely match the substituted PC
    pan = rescaleBand(pan, principalComponents.select(substitutePC - 1), matchPan);

    // Build the band list, swapping the pan band for the appropriate PC
    var sharpenBands = pcNames.set(substitutePC - 1, panBand);

    principalComponents = principalComponents.addBands(pan);
    principalComponents = principalComponents.select(sharpenBands);

    // Undo the PC transformation
    var reconstructedCentered = ee.Image(eigenVectors)
        .matrixSolve(principalComponents.toArray().toArray(1))
        .arrayProject([0])
        .arrayFlatten([bandNames])

    // Undo the mean-centering
    var reconstructed = reconstructedCentered.add(imgMean);

    return reconstructed;
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
var pca = sharpenPCA(img.select(["B2", "B3", "B4"]), img.select(["B8"]));

Map.addLayer(img, { min: 0, max: 0.5 }, "L8");
Map.addLayer(brov, { min: 0, max: 0.5 }, "Brovey");
Map.addLayer(simpleMean, { min: 0, max: 0.5 }, "SimpleMean");
Map.addLayer(ihs, { min: 0, max: 0.5 }, "IHS");
Map.addLayer(pca, { bands: ["B4", "B3", "B2"], min: 0, max: 0.5 }, "PCA")