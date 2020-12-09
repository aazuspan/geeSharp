var utils = require("users/aazuspan/geeSharpening:utils");

/**
 * Calculate bias between a reference image and a modified image. Values near 0
 * represent high similarity between images. See Vaiopoulos, 2011.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. Bias will be
 *  calculated between this image and the reference image.
 * @param {boolean, default false} perBand If true, bias will be calculated
 *  band-wise and returned as a list. If false, the average bias of all bands
 *  will be calculated and returned as a number.
 * @param {ee.Geometry, default null} geometry The region to calculate bias
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate bias at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Number | ee.List} Band average or per-band bias for the image,
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

  var bias = ybar.divide(xbar).multiply(-1).add(1).toList();

  // If not per band, average all bands
  if (perBand === false) {
    bias = ee.Number(bias.reduce(ee.Reducer.mean()));
  }

  return bias;
};
