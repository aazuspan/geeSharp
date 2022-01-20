var mse = require("users/aazuspan/geeSharp:qualityAlgorithms/MSE.js");

/**
 * Calculate root mean square error (RMSE) between a reference image and a
 * modified image. Values near 0 represent high similarity between images. RMSE
 * is relative to image intensity.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. RMSE will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry, default null} geometry The region to calculate RMSE
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate RMSE at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band RMSE for the image.
 */
exports.calculate = function (
  referenceImage,
  assessmentImage,
  geometry,
  scale,
  maxPixels
) {
  var mseBands = mse.calculate(
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
  );

  var rmse = ee.Array(mseBands.values()).sqrt();

  return ee.Dictionary.fomLists(referenceImage.bandNames(), rmse.toList());
};
