var utils = require("users/aazuspan/geeSharp:src/utils.js");

/**
 * Calculate bias between a reference image and a modified image. Values near 0
 * represent high similarity between images. See Vaiopoulos, 2011.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. Bias will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry} [geometry] The region to calculate bias
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate bias at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band bias for the image.
 */
function bias(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  if (utils._isMissing(maxPixels)) {
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
}

/**
 * Calculate Pearson's correlation coefficient (CC) between a reference image
 * and a modified image. A value of 1 represents perfect correlation.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. ERGAS will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry} [geometry] The region to calculate ERGAS
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate ERGAS at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band CC for the image.
 */
function CC(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  if (utils._isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  // List of mean band values
  var xbar = ee.Image.constant(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var ybar = ee.Image.constant(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );

  var a = referenceImage.subtract(xbar);
  var b = assessmentImage.subtract(ybar);

  var x1 = ee.Array(
    a
      .multiply(b)
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var x2 = ee.Array(
    a
      .pow(2)
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var x3 = ee.Array(
    b
      .pow(2)
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );

  var cc = x1.divide(x2.multiply(x3).sqrt());

  return ee.Dictionary.fromLists(referenceImage.bandNames(), cc.toList());
}

/**
 * Calculate Change in Mean Contrast (CMC) between a reference image
 * and a modified image. A value of 1 represents no change.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. ERGAS will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry} [geometry] The region to calculate ERGAS
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate ERGAS at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band CMC for the image.
 */
function CMC(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  if (utils._isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  var xvar = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.variance(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var yvar = ee.Array(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.variance(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var xstd = ee.Array(
    referenceImage
      .reduceRegion({
        reducer: ee.Reducer.stdDev(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );
  var ystd = ee.Array(
    assessmentImage
      .reduceRegion({
        reducer: ee.Reducer.stdDev(),
        geometry: geometry,
        scale: scale,
        maxPixels: maxPixels,
      })
      .values()
  );

  var c = xstd.multiply(ystd).multiply(2).divide(xvar.add(yvar));

  return ee.Dictionary.fromLists(referenceImage.bandNames(), c.toList());
}

/**
 * Calculate Change in Mean Luminance (CML) between a reference image
 * and a modified image. A value of 1 represents no change.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. ERGAS will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry} [geometry] The region to calculate ERGAS
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate ERGAS at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band CML for the image.
 */
function CML(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  if (utils._isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  // List of mean band values
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

  var l = xbar
    .multiply(ybar)
    .multiply(2)
    .divide(xbar.pow(2).add(ybar.pow(2)));

  return ee.Dictionary.fromLists(referenceImage.bandNames(), l.toList());
}

/**
 * Calculate difference in variance (DIV) between a reference image and a
 * modified image. Values near 0 represent high similarity between images.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. DIV will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry} [geometry] The region to calculate DIV
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate DIV at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band DIV for the image
 */
function DIV(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  if (utils._isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

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

  var DIV = yVar.divide(xVar).multiply(-1).add(1);
  return ee.Dictionary.fromLists(referenceImage.bandNames(), DIV.toList());
}

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
 * @param {ee.Geometry} [geometry] The region to calculate ERGAS
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate ERGAS at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Number} Image-wise ERGAS value.
 */
function ERGAS(
  referenceImage,
  assessmentImage,
  h,
  l,
  geometry,
  scale,
  maxPixels
) {
  if (utils._isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  var h = ee.Number(h);
  var l = ee.Number(l);

  var msek = ee.Array(
    mse(referenceImage, assessmentImage, geometry, scale, maxPixels)
      .values()
  );

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

  var bandError = ee
    .Number(msek.divide(xbark).toList().reduce(ee.Reducer.mean()))
    .sqrt();

  var ergas = bandError.multiply(h.divide(l).multiply(100));

  return ergas;
}

/**
 * Calculate mean square error (MSE) between a reference image and a modified
 * image. Values near 0 represent high similarity between images. MSE is
 * relative to image intensity.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. MSE will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry} [geometry] The region to calculate MSE
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate MSE at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band MSE for the image.
 */
function MSE(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  if (utils._isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  var mse = referenceImage.subtract(assessmentImage).pow(2).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: scale,
    maxPixels: maxPixels,
  });

  return mse;
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
 * @param {ee.Geometry} [geometry] The region to calculate Q
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate Q at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band Q for the image.
 */
function Q(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  if (utils._isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  // Correlation (1st component)
  var cc = ee.Array(
    CC(
      referenceImage,
      assessmentImage,
      geometry,
      scale,
      maxPixels
    ).values()
  );

  // Luminance (2nd component)
  var l = ee.Array(
    CML(
      referenceImage,
      assessmentImage,
      geometry,
      scale,
      maxPixels
    ).values()
  );

  // Contrast (3rd component)
  var c = ee.Array(
    CMC(
      referenceImage,
      assessmentImage,
      geometry,
      scale,
      maxPixels
    ).values()
  );

  var q = cc.multiply(l).multiply(c);

  return ee.Dictionary.fromLists(referenceImage.bandNames(), q.toList());
}

/**
 * Calculate relative average spectral error (RASE) between a reference image
 * and a modified image. Values near 0 represent low error between images.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. RASE will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry} [geometry] The region to calculate RASE
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate RASE at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Number} Image-wise RASE value.
 */
function RASE(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  if (utils._isMissing(maxPixels)) {
    maxPixels = 1e12;
  }

  var meanMSE = ee.Number(
    mse(referenceImage, assessmentImage, geometry, scale, maxPixels)
      .values()
      .reduce(ee.Reducer.mean())
  );

  // Calculate the mean of each band, then the mean of the means
  var xbar = referenceImage
    .reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: scale,
      maxPixels: maxPixels,
    })
    .values()
    .reduce(ee.Reducer.mean());

  var rase = meanMSE.sqrt().multiply(ee.Number(100).divide(xbar));

  return rase;
}

/**
 * Calculate root mean square error (RMSE) between a reference image and a
 * modified image. Values near 0 represent high similarity between images. RMSE
 * is relative to image intensity.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. RMSE will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry} [geometry] The region to calculate RMSE
 *  for.
 * @param {ee.Number} [scale] The scale, in projection units, to
 *  calculate RMSE at.
 * @param {ee.Number} [maxPixels=1e12] The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band RMSE for the image.
 */
function RMSE(referenceImage, assessmentImage, geometry, scale, maxPixels) {
  var mseBands = mse(
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
  );

  var rmse = ee.Array(mseBands.values()).sqrt();

  return ee.Dictionary.fromLists(referenceImage.bandNames(), rmse.toList());
}

exports.bias = bias;
exports.CC = CC;
exports.CMC = CMC;
exports.CML = CML;
exports.DIV = DIV;
exports.ERGAS = ERGAS;
exports.MSE = MSE;
exports.Q = Q;
exports.RASE = RASE;
exports.RMSE = RMSE;
