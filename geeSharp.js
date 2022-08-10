var sharpeners = require("users/aazuspan/geeSharp:src/sharpeners.js");
var metrics = require("users/aazuspan/geeSharp:src/metrics.js");


var _methods = {
  "GS": sharpeners.GS,
  "HPFA": sharpeners.HPFA,
  "IHS": sharpeners.IHS,
  "PCA": sharpeners.PCA,
  "SFIM": sharpeners.SFIM,
  "brovey": sharpeners.brovey,
  "simpleMean": sharpeners.simpleMean
};

var _metrics = {
  "MSE": metrics.MSE,
  "RMSE": metrics.RMSE,
  "Q": metrics.Q,
  "bias": metrics.bias,
  "DIV": metrics.DIV,
  "RASE": metrics.RASE,
  "ERGAS": metrics.ERGAS,
  "CC": metrics.CC,
  "CML": metrics.CML,
  "CMC": metrics.CMC
};

exports.methods = Object.keys(_methods);
exports.metrics = Object.keys(_metrics);


/**
 * Apply pan-sharpening to an image.
 * 
 * @param {ee.Image} sharpenable The image with sharpenable bands selected.
 * @param {ee.Image} pan The image with only the panchromatic band selected.
 * @param {string} method The sharpening algorithm to use. Use `geeSharp.methods` to get a list of available methods.
 * @param {object} [args={}] Additional arguments. Some algorithms, e.g. Gram-Schmidt require other args.
 * @returns {ee.Image} The sharpened image.
 */
exports.sharpen = function(sharpenable, pan, method, args) {
  var fn = _methods[method || "SFIM"];
  
  if (fn == null)
    throw new Error("Method must be one of [" + exports.methods + "], not `" + method + "`.");
  
  // Remove the method name from the args so the rest can be passed to the
  // sharpening function.
  arguments.splice(2, 1);
  
  return fn.apply(null, arguments);
}



/**
 * Calculate image quality between an original reference image and a modified (e.g. pan-sharpened) image.
 * 
 * @param {ee.Image} original The original image to compare against.
 * @param {ee.Image} modified The modified image to assess.
 * @param {string} metric The quality metric to calculate. Use `geesharp.metrics` to get a list of available metrics.
 * @param {object} [args={}] Additional optional arguments, such as `geometry`, `scale`, and `maxPixels.
 * @returns {ee.Dictionary | ee.Number} A dictionary with band-wise metrics or a number with the image-wise metric.
 */
exports.quality = function(original, modified, metric, args) {
  var fn = _metrics[metric];
  
  if (fn == null)
    throw new Error("Metric must be one of [" + exports.metrics + "], not `" + metric + "`.");
  
  // Remove the metric name from the args so the rest can be passed to the
  // metric calculation function.
  arguments.splice(2, 1);
  
  return fn.apply(null, arguments);
}