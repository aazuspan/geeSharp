var utils = require("users/aazuspan/geeSharpening:utils");

// Calculate per-band Pearson's correlation between a reference image and a modified image.
function calculateCorrelation(
  referenceImage,
  assessmentImage,
  geometry,
  scale,
  maxPixels
) {
  // List of mean band values
  var xbar = referenceImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values();
  var ybar = assessmentImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values();

  var xCentered = referenceImage.subtract(ee.Image.constant(xbar));
  var yCentered = assessmentImage.subtract(ee.Image.constant(ybar));

  var correlationNumerator = ee.Array(
    xCentered
      .multiply(yCentered)
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );

  var xSum = xCentered
    .pow(2)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values();
  var ySum = yCentered
    .pow(2)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values();

  var correlationDenominator = ee.Array(xSum).multiply(ee.Array(ySum)).sqrt();

  var correlation = correlationNumerator.divide(correlationDenominator);

  return correlation;
}

// Calculate per-band luminance between a reference image and a modified image.
function calculateLuminance(
  referenceImage,
  assessmentImage,
  geometry,
  scale,
  maxPixels
) {
  // List of mean band values
  var xbar = referenceImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values();
  var ybar = assessmentImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values();

  var luminanceNumerator = ee.Array(xbar).multiply(ybar).multiply(2);
  var luminanceDenominator = ee.Array(xbar).pow(2).add(ee.Array(ybar).pow(2));
  var luminance = luminanceNumerator.divide(luminanceDenominator);

  return luminance;
}

// Calculate per-band contrast between a reference image and a modified image.
function calculateContrast(
  referenceImage,
  assessmentImage,
  geometry,
  scale,
  maxPixels
) {
  var xStdDev = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.stdDev(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var yStdDev = ee.Array(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.stdDev(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var xVar = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.variance(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var yVar = ee.Array(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.variance(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );

  var contrastNumerator = xStdDev.multiply(yStdDev).multiply(2);
  var contrastDenominator = xVar.add(yVar);
  var contrast = contrastNumerator.divide(contrastDenominator);

  return contrast;
}

/**
 * Calculate Q between a reference image and a modified image. Values near 1
 * represent low distortion.
 *
 * See Wang & Bovik, 2002.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. Q will be
 *  calculated between this image and the reference image.
 * @param {boolean, default false} perBand If true, Q will be calculated
 *  band-wise and returned as a list. If false, the average Q of all bands
 *  will be calculated and returned as a number.
 * @param {ee.Geometry, default null} geometry The region to calculate Q
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate Q at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Number | ee.List} Band average or per-band Q for the image,
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

  // Resample the reference image to match the assessment image resolution and origin
  referenceImage = referenceImage
    .resample("bicubic")
    .reproject(assessmentImage.projection());

  // Correlation (1st component)
  var correlation = calculateCorrelation(
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
  );

  // Luminance (2nd component)
  var luminance = calculateLuminance(
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
  );

  // Contrast (3rd component)
  var contrast = calculateContrast(
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
  );

  var q = correlation.multiply(luminance).multiply(contrast).toList();

  // If not per band, average all bands
  if (perBand === false) {
    q = ee.Number(q.reduce(ee.Reducer.mean()));
  }

  return q;
};
