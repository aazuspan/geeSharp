var mse = require("users/aazuspan/geeSharpening:qualityAlgorithms/MSE");
var utils = require("users/aazuspan/geeSharpening:utils");

// Dimensionless Global Relative Error of Synthesis (ERGAS) measures spectral distortion
// relative to the sharpening ratio. This compensates for the fact that larger increases in
// spatial resolution will typically result in greater spectral distortion. Values near to
// zero indiciate low distortion.
exports.calculate = function (referenceImage, assessmentImage, perBand) {
  // Default to returning image average
  if (utils.isMissing(perBand)) {
    perBand = false;
  }

  var mseBands = ee.Array(mse.calculate(referenceImage, assessmentImage, true));
  var xbar = ee.Array(referenceImage.reduceRegion(ee.Reducer.mean()).values());
  var bandVals = mseBands.divide(xbar.pow(2)).sqrt();

  var h = assessmentImage.projection().nominalScale();
  var l = referenceImage.projection().nominalScale();

  var coeff = h.divide(l).multiply(100);

  var ergas = bandVals.multiply(coeff).toList();

  // If not per band, average all bands
  if (perBand === false) {
    ergas = ee.Number(ergas.reduce(ee.Reducer.mean()));
  }

  return ergas;
};