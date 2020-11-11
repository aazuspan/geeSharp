var utils = require("users/aazuspan/geeSharpening:utils");

// Calculate bias, which measures similartiy between images. Values near 0 are good. Vaiopoulos 2011.
exports.calculate = function (referenceImage, assessmentImage, perBand) {
  // Default to returning image average
  if (utils.isMissing(perBand)) {
    perBand = false;
  }

  var xbar = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        maxPixels: 1e11,
      })
      .values()
  );
  var ybar = ee.Array(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        maxPixels: 1e11,
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
