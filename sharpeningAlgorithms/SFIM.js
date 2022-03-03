/**
 * Sharpen an image using Smoothing Filter-based Intensity Modulation (SFIM).
 * @param {ee.Image} img An image to sharpen. All bands should spectrally
 *  overlap the panchromatic band to avoid spectral distortion.
 * @param {ee.Image} pan An single-band panchromatic image.
 * @return {ee.Image} The input image with all bands sharpened to the spatial
 *  resolution of the panchromatic band.
 */
exports.sharpen = function (img, pan) {
    var imgScale = img.projection().nominalScale();
    var panScale = pan.projection().nominalScale();

    var kernelWidth = imgScale.divide(panScale);
    var kernel = ee.Kernel.square({ radius: kernelWidth.divide(2) });

    var panSmooth = pan.reduceNeighborhood({ reducer: ee.Reducer.mean(), kernel: kernel });

    img = img.resample("bicubic");
    var sharp = img.multiply(pan).divide(panSmooth).reproject(pan.projection());
    return sharp;
};
