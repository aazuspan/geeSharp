/**
 * Create a constant image where each band represents the reduced value of the
 * corresponding band of the input image.
 * @param {ee.Image} img The input image to calculate reduced values for.
 * @param {ee.Reducer} reducer The reducer to apply to the image, such as ee.Reducer.min()
 * @return {ee.Image} An image with the same number of bands as the input
 *  image, where each band is a constant value of the reduced value of the 
 *  corresponding band of the input image.
*/
exports.reduceImage = function (img, reducer) {
    // Calculate the reduced image value(s)
    var imgReducedVal = img.reduceRegion({
        reducer: reducer,
        geometry: img.geometry(),
        scale: img.projection().nominalScale(),
        maxPixels: 1e9
    });

    var imgReduced = ee.Image.constant(imgReducedVal.values(img.bandNames()));
    return imgReduced;
}


/**
 * Create a constant image where each band represents the range value of the
 * corresponding band of the input image.
 * @param {ee.Image} img The input image to calculate range values for.
 * @return {ee.Image} An image with the same number of bands as the input
 *  image, where each band is a constant value of the range value of the 
 *  corresponding band of the input image.
*/
exports.getImageRange = function (img) {
    var imgMax = exports.reduceImage(img, ee.Reducer.max());
    var imgMin = exports.reduceImage(img, ee.Reducer.min());
    var imgRange = imgMax.subtract(imgMin);
    return imgRange;
}


/**
 * Rescale the mean and standard deviation of a target image to match a reference image.
 * @param {ee.Image} targetImage An image to rescale.
 * @param {ee.Image} referenceImage An image to rescale towards. 
 * @return {ee.Image} A rescaled version of targetImage.
*/
exports.linearHistogramMatch = function (targetImage, referenceImage) {
    var offsetTarget = exports.reduceImage(targetImage, ee.Reducer.mean());
    var offset = exports.reduceImage(referenceImage, ee.Reducer.mean());
    var scale = exports.reduceImage(referenceImage, ee.Reducer.stdDev())
        .divide(exports.reduceImage(targetImage, ee.Reducer.stdDev()));

    var rescaledTarget = targetImage.subtract(offsetTarget).multiply(scale).add(offset);
    return rescaledTarget;
}


/**
 * Check if an object has a value. Helpful for finding missing arguments.
 * @param {object} x Any object 
 * @return {boolean} True if the object is missing, false if it is not.
*/
exports.isMissing = function (x) {
    if (x === undefined || x === null) {
        return true;
    }
    return false;
}


/**
 * Calculate an intensity band from the bands of an image using fixed band weights.
 * @param {ee.Image} img An image to calculate intensity from.
 * @param {ee.List} weights A list of weights for each band. Length must equal the
 *  number of bands in img.
 * @return {ee.Image} A single band image representing the weighted intensity of 
 *  the original image.
*/
exports.calculateWeightedIntensity = function (img, weights) {
    var weightedImg = img.multiply(weights);

    var intensity = weightedImg.reduce(ee.Reducer.sum());

    return intensity;
}