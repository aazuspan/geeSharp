var mse = require("users/aazuspan/geeSharp:qualityAlgorithms/MSE.js");
var utils = require("users/aazuspan/geeSharp:utils.js");

/**
 * Calculate dimensionless global relative error of synthsis (ERGAS) between a
 * reference image and a modified image. Values near 0 represent low error
 * between images.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. ERGAS will be
 *  calculated between this image and the reference image.
 * @param {ee.Number} h Spatial resolution of the sharpened image.
 * @param {ee.Number} l Spatial resolution of the unsharpened image.
 * @param {ee.Geometry, default null} geometry The region to calculate ERGAS
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate ERGAS at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Number} Image-wise ERGAS value.
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

  var h = ee.Number(h);
  var l = ee.Number(l);

  var msek = ee.Array(
    mse.calculate(
      referenceImage,
      assessmentImage,
      geometry,
      scale,
      maxPixels
    )
  ).values();

  // Calculate the mean of each band
  var xbark = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );

  var bandError = ee.Number(msek.divide(xbark).toList().reduce(ee.Reducer.mean())).sqrt();

  var ergas = bandError.multiply(h.divide(l).multiply(100));

  return ergas;
};
