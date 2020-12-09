var mse = require("users/aazuspan/geeSharpening:qualityAlgorithms/MSE");
var utils = require("users/aazuspan/geeSharpening:utils");

/**
 * Calculate relative average spectral error (RASE) between a reference image
 * and a modified image. Values near 0 represent low error between images.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. RASE will be
 *  calculated between this image and the reference image.
 * @param {boolean, default false} perBand If true, RASE will be calculated
 *  band-wise and returned as a list. If false, the average RASE of all bands
 *  will be calculated and returned as a number.
 * @param {ee.Geometry, default null} geometry The region to calculate RASE
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate RASE at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Number | ee.List} Band average or per-band RASE for the image,
 *  depending on perBand.
 */
exports.calculate = function (
  referenceImage,
  assessmentImage,
  perBand,
  geometry,
  scale,
  maxPixels
) {
  // Default to returning image average
  if (utils.isMissing(perBand)) {
    perBand = false;
  }

  if (utils.isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  var mseBands = ee
    .Array(
      mse.calculate(
        referenceImage,
        assessmentImage,
        true,
        geometry,
        scale,
        maxPixels
      )
    )
    .sqrt();

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

  var rase = mseBands.multiply(100).divide(xbar).toList();

  // If not per band, average all bands
  if (perBand === false) {
    rase = ee.Number(rase.reduce(ee.Reducer.mean()));
  }

  return rase;
};
