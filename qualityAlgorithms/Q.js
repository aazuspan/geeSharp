var utils = require("users/aazuspan/geeSharp:utils.js");

var CC = require("users/aazuspan/geeSharp:qualityAlgorithms/CC.js")
var CML = require("users/aazuspan/geeSharp:qualityAlgorithms/CML.js")
var CMC = require("users/aazuspan/geeSharp:qualityAlgorithms/CMC.js")


/**
 * Calculate Q between a reference image and a modified image. Values near 1
 * represent low distortion.
 *
 * See Wang & Bovik, 2002.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. Q will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry, default null} geometry The region to calculate Q
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate Q at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band Q for the image.
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

  // Correlation (1st component)
  var cc = ee.Array(CC.calculate(
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
  ).values());

  // Luminance (2nd component)
  var l = ee.Array(CML.calculate(
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
  ).values());

  // Contrast (3rd component)
  var c = ee.Array(CMC.calculate(
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
  ).values());

  var q = cc.multiply(l).multiply(c)

  return ee.Dictionary.fromLists(referenceImage.bandNames(), q.toList());
};
