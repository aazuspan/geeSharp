/**
 * Calculate Change in Mean Contrast (CMC) between a reference image 
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
 * @return {ee.Dictionary} Per-band CMC for the image.
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

    var xvar = ee.Array(referenceImage
        .reduceRegion({
            reducer: ee.Reducer.variance(),
            geometry: geometry,
            scale: scale,
            maxPixels: maxPixels,
        })
        .values());
    var yvar = ee.Array(assessmentImage
        .reduceRegion({
            reducer: ee.Reducer.variance(),
            geometry: geometry,
            scale: scale,
            maxPixels: maxPixels,
        })
        .values());
    var xstd = ee.Array(referenceImage
        .reduceRegion({
            reducer: ee.Reducer.stdDev(),
            geometry: geometry,
            scale: scale,
            maxPixels: maxPixels,
        })
        .values());
    var ystd = ee.Array(assessmentImage
        .reduceRegion({
            reducer: ee.Reducer.stdDev(),
            geometry: geometry,
            scale: scale,
            maxPixels: maxPixels,
        })
        .values());

    var c = xstd.multiply(ystd).multiply(2).divide(xvar.add(yvar))

    return ee.Dictionary.fromLists(referenceImage.bandNames(), c.toList());
}