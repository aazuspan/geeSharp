var utils = require("users/aazuspan/geeSharp:utils.js");

/**
 * Calculate mean square error (MSE) between a reference image and a modified
 * image. Values near 0 represent high similarity between images. MSE is
 * relative to image intensity.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. MSE will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry, default null} geometry The region to calculate MSE
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate MSE at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band MSE for the image.
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

  var mse = referenceImage
    .subtract(assessmentImage)
    .pow(2)
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })

  return mse;
};
