/**
 * Calculate Change in Mean Luminance (CML) between a reference image 
 * and a modified image. A value of 1 represents no change.
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
 * @return {ee.Dictionary} Per-band CML for the image.
 */
exports.calculate = function (
    referenceImage,
    assessmentImage,
    geometry,
    scale,
    maxPixels
) {
    // List of mean band values
    var xbar = ee.Array(referenceImage
        .reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: geometry,
            scale: scale,
            maxPixels: maxPixels,
        })
        .values());
    var ybar = ee.Array(assessmentImage
        .reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: geometry,
            scale: scale,
            maxPixels: maxPixels,
        })
        .values());

    var l = xbar.multiply(ybar).multiply(2).divide(xbar.pow(2).add(ybar.pow(2)));

    return ee.Dictionary.fromLists(referenceImage.bandNames(), l.toList());
}