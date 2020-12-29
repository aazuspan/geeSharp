var mse = require("users/aazuspan/geeSharp:qualityAlgorithms/MSE.js");
var utils = require("users/aazuspan/geeSharp:utils.js");

/**
 * Calculate root mean square error (RMSE) between a reference image and a
 * modified image. Values near 0 represent high similarity between images. RMSE
 * is relative to image intensity.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. RMSE will be
 *  calculated between this image and the reference image.
 * @param {boolean, default false} perBand If true, RRMSE will be calculated
 *  band-wise and returned as a list. If false, the average RMSE of all bands
 *  will be calculated and returned as a number.
 * @param {ee.Geometry, default null} geometry The region to calculate RMSE
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate RMSE at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Number | ee.List} Band average or per-band RMSE for the image,
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

  var mseBands = mse.calculate(
    referenceImage,
    assessmentImage,
    true,
    geometry,
    scale,
    maxPixels
  );

  var rmse = ee.Array(mseBands).sqrt().toList();

  // If not per band, average all bands
  if (perBand === false) {
    rmse = ee.Number(rmse.reduce(ee.Reducer.mean()));
  }

  return rmse;
};
