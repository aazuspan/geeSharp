/**
 * Calculate Pearson's correlation coefficient (CC) between a reference image 
 * and a modified image. A value of 1 represents perfect correlation.
 * @param {ee.Image} referenceImage An unmodified image.
 * @param {ee.Image} assessmentImage A version of the reference image that has
 *  been modified, such as through compression or pan-sharpening. ERGAS will be
 *  calculated between this image and the reference image.
 * @param {ee.Geometry, default null} geometry The region to calculate ERGAS
 *  for.
 * @param {ee.Number, default null} scale The scale, in projection units, to
 *  calculate ERGAS at.
 * @param {ee.Number, default 1000000000000} maxPixels The maximum number of
 *  pixels to sample.
 * @return {ee.Dictionary} Per-band CC for the image.
 */
exports.calculate = function (
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
) {
    // List of mean band values
    var xbar = ee.Image.constant(referenceImage
        .reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: geometry,
            scale: scale,
            maxPixels: maxPixels,
        })
        .values());
    var ybar = ee.Image.constant(assessmentImage
        .reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: geometry,
            scale: scale,
            maxPixels: maxPixels,
        })
        .values());

    var a = referenceImage.subtract(xbar);
    var b = assessmentImage.subtract(ybar);

    var x1 = ee.Array(a.multiply(b).reduceRegion(
        { reducer: ee.Reducer.sum(), geometry: geometry, scale: scale, maxPixels: maxPixels }).values())
    var x2 = ee.Array(a.pow(2).reduceRegion(
        { reducer: ee.Reducer.sum(), geometry: geometry, scale: scale, maxPixels: maxPixels }).values())
    var x3 = ee.Array(b.pow(2).reduceRegion(
        { reducer: ee.Reducer.sum(), geometry: geometry, scale: scale, maxPixels: maxPixels }).values())

    var cc = x1.divide(x2.multiply(x3).sqrt())

    return ee.Dictionary.fromLists(referenceImage.bandNames(), cc.toList())
}