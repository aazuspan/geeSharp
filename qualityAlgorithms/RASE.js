var mse = require("users/aazuspan/geeSharp:qualityAlgorithms/MSE.js");
var utils = require("users/aazuspan/geeSharp:utils.js");

/**
 * Calculate relative average spectral error (RASE) between a reference image
 * and a modified image. Values near 0 represent low error between images.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. RASE will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry, default null} geometry The region to calculate RASE
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate RASE at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Number} Image-wise RASE value.
 */
exports.calculate = function (
  referenceImage,
  assessmentImage,
  geometry,
  scale,
  maxPixels
) {
  if (utils.isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  var meanMSE = ee.Number(
    mse.calculate(referenceImage, assessmentImage, geometry, scale, maxPixels).values().reduce(ee.Reducer.mean())
  );

  // Calculate the mean of each band, then the mean of the means
  var xbar = referenceImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values()
    .reduce(ee.Reducer.mean());

  var rase = meanMSE.sqrt().multiply(ee.Number(100).divide(xbar));

  return rase;
};
