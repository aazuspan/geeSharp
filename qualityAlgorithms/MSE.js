var utils = require("users/aazuspan/geeSharpening:utils");

/**
 * Calculate mean square error (MSE) between a reference image and a modified
 * image. Values near 0 represent high similarity between images. MSE is
 * relative to image intensity.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. MSE will be
 *  calculated between this image and the reference image.
 * @param {boolean, default false} perBand If true, MSE will be calculated
 *  band-wise and returned as a list. If false, the average MSE of all bands
 *  will be calculated and returned as a number.
 * @param {ee.Geometry, default null} geometry The region to calculate MSE
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate MSE at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Number | ee.List} Band average or per-band MSE for the image,
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

  var mse = referenceImage
    .subtract(assessmentImage)
    .pow(2)
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values();

  // If not per band, average all bands
  if (perBand === false) {
    mse = ee.Number(mse.reduce(ee.Reducer.mean()));
  }

  return mse;
};
