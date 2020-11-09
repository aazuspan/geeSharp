// Calculate band-to-band Pearson's correlation between a reference image and a modified image.
function calculateCorrelation(referenceImage, assessmentImage) {
  // List of mean band values
  var xbar = referenceImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      maxPixels: 1e11,
    })
    .values();
  var ybar = assessmentImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      maxPixels: 1e11,
    })
    .values();

  // Pearson's correlation (1st component)
  var xCentered = referenceImage.subtract(ee.Image.constant(xbar));
  var yCentered = assessmentImage.subtract(ee.Image.constant(ybar));

  var correlationNumerator = ee.Array(
    xCentered
      .multiply(yCentered)
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        maxPixels: 1e11,
      })
      .values()
  );

  var xSum = xCentered
    .pow(2)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      maxPixels: 1e11,
    })
    .values();
  var ySum = yCentered
    .pow(2)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      maxPixels: 1e11,
    })
    .values();

  var correlationDenominator = ee.Array(xSum).multiply(ee.Array(ySum)).sqrt();

  var correlation = correlationNumerator.divide(correlationDenominator);

  return correlation;
}

// Calculate band-to-band luminance between a reference image and a modified image.
function calculateLuminance(referenceImage, assessmentImage) {
  // List of mean band values
  var xbar = referenceImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      maxPixels: 1e11,
    })
    .values();
  var ybar = assessmentImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      maxPixels: 1e11,
    })
    .values();

  var luminanceNumerator = ee.Array(xbar).multiply(ybar).multiply(2);
  var luminanceDenominator = ee.Array(xbar).pow(2).add(ee.Array(ybar).pow(2));
  var luminance = luminanceNumerator.divide(luminanceDenominator);

  return luminance;
}

// Calculate band-to-band contrast between a reference image and a modified image.
function calculateContrast(referenceImage, assessmentImage) {
  var xStdDev = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.stdDev(),
        maxPixels: 1e11,
      })
      .values()
  );
  var yStdDev = ee.Array(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.stdDev(),
        maxPixels: 1e11,
      })
      .values()
  );
  var xVar = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.variance(),
        maxPixels: 1e11,
      })
      .values()
  );
  var yVar = ee.Array(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.variance(),
        maxPixels: 1e11,
      })
      .values()
  );

  var contrastNumerator = xStdDev.multiply(yStdDev).multiply(2);
  var contrastDenominator = xVar.add(yVar);
  var contrast = contrastNumerator.divide(contrastDenominator);

  return contrast;
}

// Calculating Q index. See Wang and Bovik 2002.
exports.calculate = function (referenceImage, assessmentImage) {
  // Resample the reference image to match the assessment image resolution and origin
  referenceImage = referenceImage
    .resample("bicubic")
    .reproject(assessmentImage.projection());

  // Correlation (1st component)
  var correlation = calculateCorrelation(referenceImage, assessmentImage);

  // Luminance (2nd component)
  var luminance = calculateLuminance(referenceImage, assessmentImage);

  // Contrast (3rd component)
  var contrast = calculateContrast(referenceImage, assessmentImage);

  var qBands = correlation.multiply(luminance).multiply(contrast);

  // Average the band q values to get a cumulative q value
  var q = ee.Number(qBands.toList().reduce(ee.Reducer.mean()));

  return q;
};
