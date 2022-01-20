var utils = require("users/aazuspan/geeSharp:utils.js");

/**
 * Calculate bias between a reference image and a modified image. Values near 0
 * represent high similarity between images. See Vaiopoulos, 2011.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. Bias will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry, default null} geometry The region to calculate bias
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate bias at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band bias for the image.
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

  var xbar = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var ybar = ee.Array(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );

  var bias = ybar.divide(xbar).multiply(-1).add(1);

  return ee.Dictionary.fromLists(referenceImage.bandNames(), bias.toList());
};
