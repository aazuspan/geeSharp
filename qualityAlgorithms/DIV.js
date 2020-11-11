var utils = require("users/aazuspan/geeSharpening:utils");

// Difference in variance (DIV) measures change in variance. Values near 0 are good.  Vaiopoulos 2011.
exports.calculate = function (referenceImage, assessmentImage, perBand) {
  // Default to returning image average
  if (utils.isMissing(perBand)) {
    perBand = false;
  }

  var xVar = ee.Array(
    referenceImage.reduceRegion(ee.Reducer.variance()).values()
  );
  var yVar = ee.Array(
    assessmentImage.reduceRegion(ee.Reducer.variance()).values()
  );

  var DIV = yVar.divide(xVar).multiply(-1).add(1).toList();

  // If not per band, average all bands
  if (perBand === false) {
    DIV = ee.Number(DIV.reduce(ee.Reducer.mean()));
  }

  return DIV;
};
