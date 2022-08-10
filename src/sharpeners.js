var utils = require("users/aazuspan/geeSharp:src/utils.js");

/**
 * Sharpen an image using Brovey sharpening, where each band is calculated
 * based on a weighted intensity band and the panchromatic band.
 * @param {ee.Image} img An image to sharpen. All bands should spectrally
 *  overlap the panchromatic band to avoid spectral distortion.
 * @param {ee.Image} pan An single-band panchromatic image.
 * @param {ee.List} weights A list of weights to apply to each band. If
 *  missing, equal weights will be used.
 * @return {ee.Image} The input image with all bands sharpened to the spatial
 *  resolution of the panchromatic band.
 */
function brovey(img, pan, weights) {
  var panProj = pan.projection();

  // If any weights are missing, use equal weights
  if (utils.isMissing(weights)) {
    var bandNum = img.bandNames().length();
    var bandWeight = ee.Number(1).divide(bandNum);
    weights = ee.List.repeat(bandWeight, bandNum);
  }

  // Calculate intensity band as sum of the weighted visible bands
  var intensity = utils.calculateWeightedIntensity(img, weights);
  // Resample the intensity band
  var intensitySharp = intensity.resample().reproject(panProj);

  var imgBrovey = img.resample("bilinear").reproject(panProj);
  imgBrovey = imgBrovey.divide(intensitySharp).multiply(pan);

  return imgBrovey;
}

/**
 * Calculate the next Gram-Schmidt transformed image given a list of previous
 * Gram-Schmidt transformed images. See Equation 1 of Hallabia et al 2014.
 * @param {ee.Image} ms A multispectral image.
 * @param {ee.List} gsList A list of Gram-Schmidt transformed images.
 */
function calculateGs(ms, gsList) {
  // Get the reduction parameters which are passed through the gsList
  var reductionParameters = ee.List(ee.List(gsList).get(0));

  // Unpack the parameters
  var geometry = reductionParameters.get(0);
  var scale = reductionParameters.get(1);
  var maxPixels = reductionParameters.get(2);

  // Get the previous GS as the last element
  var previous = ee.Image(ee.List(gsList).get(-1));

  // Calculate coefficient g between MS and previous GS
  var g = calculateGsCoefficient(ms, previous, geometry, scale, maxPixels);
  var gsNew = ms.subtract(g);

  // Return the list with the new GS image added
  return ee.List(gsList).add(gsNew);
}

/**
 * Calculate the Gram-Schmidt coefficient g. See Equation 2 in Hallabia et al
 * 2014.
 * @param {ee.Image} ms A multispectral image.
 * @param {ee.Image} gs A Gram-Schmidt transformed image.
 * @param {ee.Geometry} geometry The region to calculate image
 *  statistics for. Sharpening will only be accurate within this region.
 * @param {ee.Number} scale The scale, in projection units, to
 *  calculate image statistics at.
 * @param {ee.Number} maxPixels The maximum number of pixels to sample when
 *  calculating image statistics
 * @return {ee.Image} A constant GS coefficient.
 */
function calculateGsCoefficient(ms, gs, geometry, scale, maxPixels) {
  var imgArray = ee.Image.cat(ms, gs).toArray();

  var covarMatrix = imgArray.reduceRegion({
    reducer: ee.Reducer.covariance(),
    geometry: geometry,
    scale: scale,
    maxPixels: maxPixels,
  });

  var covarArray = ee.Array(covarMatrix.get("array"));

  var covar = covarArray.get([0, 1]);
  var variance = covarArray.get([1, 1]);

  var g = covar.divide(variance);

  return ee.Image.constant(g);
}

/**
 * Sharpen all bands of an image using the Gram-Schmidt orthonormalization
 * process, following Hallabia et al 2014.
 * @param {ee.Image} img An image to sharpen.
 * @param {ee.Image} pan An single-band panchromatic image.
 * @param {ee.Geometry, default null} geometry The region to calculate image
 *  statistics for. Sharpening will only be accurate within this region.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate image statistics at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample when calculating image statistics.
 * @return {ee.Image} The input image with all bands sharpened to the spatial
 *  resolution of the panchromatic band.
 */
function GS(img, pan, geometry, scale, maxPixels) {
  // Params passed through iterate need to be explicitly set to null or else
  // GEE serialization will fail
  if (utils.isMissing(geometry)) {
    geometry = null;
  }

  if (utils.isMissing(scale)) {
    scale = null;
  }

  if (utils.isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  // Resample multispectral bands to pan resolution
  img = img.resample("bilinear").reproject({
    crs: pan.projection(),
    scale: pan.projection().nominalScale(),
  });

  // Calculate panSim as a mean of the MS bands
  var panSim = img.reduce(ee.Reducer.mean()).clip(img.geometry());

  // The reduction parameters to be passed to calculateGs
  var reductionParameters = [geometry, scale, maxPixels];

  // GS1 image is the panSim. Including the reduction parameters here is awful,
  // but the only way to pass them to calculateGs via iterate.
  var gsList = ee.List([reductionParameters, panSim]);

  // Convert the multispectral bands to an image collection so that it can be
  // iterated over
  var msCollection = utils.multibandToCollection(img);

  // Iterate over the MS collection, calculating GS bands. Slice to remove the
  // reduction parameters.
  var gsCollection = ee.ImageCollection(
    ee.List(msCollection.iterate(calculateGs, gsList)).slice(1)
  );

  // Convert the GS collection to a multiband image
  var gsBands = gsCollection.toBands();

  // Histogram match the pan band to the simulated pan band
  var panMatch = utils.linearHistogramMatch(
    pan,
    panSim,
    geometry,
    scale,
    maxPixels
  );

  // Swap the matched pan band for the first GS band
  gsBands = ee.Image.cat(panMatch, gsBands.slice(1));

  // Spatial detail is the difference between the matched pan band and the simulated pan band
  var detail = panMatch.subtract(panSim);

  // Convert GS bands to an image collection so that it can be mapped over
  var gsBandImages = utils.multibandToCollection(gsBands);

  // Calculate constant g coefficients for each gsBand
  var gCoefficients = gsBandImages.map(function (x) {
    return calculateGsCoefficient(x, panSim, geometry, scale, maxPixels);
  });

  // Sharpen the multispectral bands using g coefficients and pan detail
  var sharpBands = img.add(gCoefficients.toBands().slice(1).multiply(detail));

  return sharpBands;
}

/**
 * Sharpen an image using an additive high-pass filter, where spatial detail is
 * extracted from a panchromatic band using a high-pass filter and added into
 * the multispectral bands.
 * @param {ee.Image} img An image to sharpen. All bands should spectrally
 *  overlap the panchromatic band to avoid spectral distortion.
 * @param {ee.Image} pan An single-band panchromatic image.
 * @param {number} kernelWidth The width of the high-pass filter kernel. This
 *  defaults to 2 * (msRes / panRes) + 1, where msRes is the multispectral
 *  pixel width and panRes is the panchromatic pixel width. For example,
 *  Landsat 8 has msRes of 30 and panRes of 15, so (2 * (30 / 15) + 1) = 5.
 * @return {ee.Image} The input image with all bands sharpened to the spatial
 *  resolution of the panchromatic band.
 */
function HPFA(img, pan, kernelWidth) {
  // Calculate default kernel width following Gangofner et al 2008
  if (utils.isMissing(kernelWidth)) {
    var panRes = pan.projection().nominalScale();
    var msRes = img.projection().nominalScale();

    kernelWidth = ee.Number(msRes.divide(panRes).multiply(2).add(1));
  } else {
    // Make sure it's an ee.Number so it has the necessary methods
    kernelWidth = ee.Number(kernelWidth);
  }

  // Resample multispectral bands to the panchromatic resolution
  img = img.resample("bilinear");
  img = img.reproject(pan.projection());

  pan = pan.resample("bilinear");

  // Calculate kernel center value following Gangofner et al 2008
  var centerVal = kernelWidth.pow(2).subtract(1);
  // Get the index of the kernel center
  var center = kernelWidth.divide(2).int();
  // Build a single kernel row
  var kernelRow = ee.List.repeat(-1, kernelWidth);
  // Build a kernel out of rows
  var kernel = ee.List.repeat(kernelRow, kernelWidth);
  // Replace the center position of the kernel with the center value
  kernel = kernel.set(
    center,
    ee.List(kernel.get(center)).set(center, centerVal)
  );
  // Use a normalized kernel to minimize spectral distortion
  kernel = ee.Kernel.fixed({ weights: kernel, normalize: true });

  // Use a high pass filter to extract spatial detail from the pan band
  var panHPF = pan.convolve(kernel);
  // Add pan HPF to each multispectral band
  var imgHPFA = img.add(panHPF);

  return imgHPFA;
}

/**
 * Sharpen all bands of an image using IHS, where RGB bands are converted to
 * IHS and the intensity data is swapped for the panchromatic band.
 * @param {ee.Image} img An image to sharpen. To work correctly, the image must
 * have 3 bands: red, green, and blue.
 * @param {ee.Image} pan An single-band panchromatic image.
 * @return {ee.Image} The input image with all bands sharpened to the spatial
 *  resolution of the panchromatic band.
 */
function IHS(img, pan) {
  var panProj = pan.projection();
  // Store pan band name
  var panBand = pan.bandNames().get(0);
  img = img.resample("bilinear").reproject(panProj);

  var imgHsv = img.rgbToHsv();

  // Replace the value band with the pan band and convert back to RGB
  var imgRgb = imgHsv
    .addBands([pan])
    .select(["hue", "saturation", panBand])
    .hsvToRgb()
    .rename(img.bandNames());

  return imgRgb;
}

/**
 * Sharpen all bands of an image by converting it to principal components,
 * rescaling a panchromatic band to match the first principal component,
 * swapping the high-resolution panchromatic band for the first principal
 * component, and inverting the transformation to create a high-resolution
 * multispectral image.
 * @param {ee.Image} img An image to sharpen.
 * @param {ee.Image} pan An single-band panchromatic image.
 * @param {number, default 1} substitutePC The number of the principal
 * component to replace with the pan band. Must be in range 1 - n, where n is
 * the number of bands in the input image.
 * @param {ee.Geometry, default null} geometry The region to calculate image
 *  statistics for. Sharpening will only be accurate within this region.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate image statistics at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample when calculating image statistics
 * @return {ee.Image} The input image with all bands sharpened to the spatial
 *  resolution of the panchromatic band.
 */
function PCA(img, pan, substitutePC, geometry, scale, maxPixels) {
  // Default to substituting the first PC
  if (utils.isMissing(substitutePC)) {
    substitutePC = 1;
  }

  if (utils.isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  // Resample the image to the panchromatic resolution
  img = img.resample("bilinear");
  img = img.reproject(pan.projection());

  // Store band names for future use
  var bandNames = img.bandNames();
  var panBand = pan.bandNames().get(0);

  // Mean-center the images to allow efficient covariance calculation
  var imgMean = utils.reduceImage(
    img,
    ee.Reducer.mean(),
    geometry,
    scale,
    maxPixels
  );

  var imgCentered = img.subtract(imgMean);

  // Convert image to 1D array
  var imgArray = imgCentered.toArray();

  // Calculate a covariance matrix between all bands
  var covar = imgArray.reduceRegion({
    reducer: ee.Reducer.centeredCovariance(),
    geometry: geometry,
    scale: scale,
    maxPixels: maxPixels,
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

  var principalComponents = ee
    .Image(eigenVectors)
    .matrixMultiply(imgArray2d)
    // Flatten unnecessary dimension
    .arrayProject([0])
    // Split into a multiband image
    .arrayFlatten([pcNames]);

  // Rescale the pan band to more closely match the substituted PC
  pan = utils.linearHistogramMatch(
    pan,
    principalComponents.select(substitutePC - 1),
    geometry,
    scale,
    maxPixels
  );

  // Build the band list, swapping the pan band for the appropriate PC
  var sharpenBands = pcNames.set(substitutePC - 1, panBand);

  principalComponents = principalComponents.addBands(pan);
  principalComponents = principalComponents.select(sharpenBands);

  // Undo the PC transformation
  var reconstructedCentered = ee
    .Image(eigenVectors)
    .matrixSolve(principalComponents.toArray().toArray(1))
    .arrayProject([0])
    .arrayFlatten([bandNames]);

  // Undo the mean-centering
  var reconstructed = reconstructedCentered.add(imgMean);

  return reconstructed;
}

/**
 * Sharpen an image using Smoothing Filter-based Intensity Modulation (SFIM).
 * @param {ee.Image} img An image to sharpen. All bands should spectrally
 *  overlap the panchromatic band to avoid spectral distortion.
 * @param {ee.Image} pan An single-band panchromatic image.
 * @return {ee.Image} The input image with all bands sharpened to the spatial
 *  resolution of the panchromatic band.
 */
function SFIM(img, pan) {
  var imgScale = img.projection().nominalScale();
  var panScale = pan.projection().nominalScale();

  var kernelWidth = imgScale.divide(panScale);
  var kernel = ee.Kernel.square({ radius: kernelWidth.divide(2) });

  var panSmooth = pan.reduceNeighborhood({
    reducer: ee.Reducer.mean(),
    kernel: kernel,
  });

  img = img.resample("bicubic");
  var sharp = img.multiply(pan).divide(panSmooth).reproject(pan.projection());
  return sharp;
}

/**
 * Sharpen an image using a simple mean, where each band is calculated as the
 * mean of the band and the panchromatic band.
 * @param {ee.Image} img An image to sharpen. All bands should spectrally
 *  overlap the panchromatic band to avoid spectral distortion.
 * @param {ee.Image} pan An single-band panchromatic image.
 * @return {ee.Image} The input image with all bands sharpened to the spatial
 *  resolution of the panchromatic band.
 */
function simpleMean(img, pan) {
    var panProj = pan.projection();
  
    // Resample all bands to the panchromatic resolution
    var imgSharp = img.resample("bilinear").reproject(panProj);
    // Replace each band with the mean of that band and the pan band
    imgSharp = imgSharp.add(pan).multiply(0.5);
  
    return imgSharp;
  };

exports.brovey = brovey;
exports.GS = GS;
exports.HPFA = HPFA;
exports.IHS = IHS;
exports.PCA = PCA;
exports.SFIM = SFIM;
exports.simpleMean = simpleMean;