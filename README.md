# geeSharp

Pan-sharpen multispectral imagery in GEE with one line of code:

```javascript
var panSharpened = sharpening.PCA.sharpen(img.select(["B4", "B3", "B2",]), img.select(["B8"]);
```

![Example image](https://raw.githubusercontent.com/aazuspan/geeSharp.js/main/sharpening_example.png)

## Setup

- Import sharpening functions in your script.
```javascript
var sharpening = require("users/aazuspan/geeSharp:sharpening.js");
```
- Import image quality functions in your script.
```javascript
var quality = require("users/aazuspan/geeSharp:quality.js");
```

## Usage

### Pan-sharpening

There are a number of pan-sharpening functions in `geeSharp` that produce different results. Most can be called using the example pattern below.

```javascript
sharpening.Algorithm.sharpen(unsharpenedBands, panBand)
```

Most sharpening functions just require the unsharpened multispectral bands and the high-resolution panchromatic band as inputs, but some algorithms may require other parameters. See the [documentation](https://github.com/aazuspan/geeSharp.js/wiki/Sharpening-Functions) for detailed descriptions.

#### Example

```javascript
// Load the sharpening functions
var sharpening = require("users/aazuspan/geeSharp:sharpening.js");

// Select an example Landsat 8 TOA image to sharpen
var img = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_047027_20160819");

// Select the 30 m spectral bands to sharpen
var unsharpened = img.select(["B4", "B3", "B2"]);

// Select the 15 m panchromatic band
var pan = img.select(["B8"]);

// Pan-sharpen using Gram-Schmidt
var sharpened = sharpening.GS.sharpen(unsharpened, pan);

// Add images to the map to visually compare
Map.addLayer(unsharpened, {max: 0.3}, "Unsharpened")
Map.addLayer(sharpened, {max: 0.3}, "Sharpened")
Map.centerObject(ee.Geometry.Point([-122.40961256101373, 47.25412917913268]), 14)
```

### Image quality assessment

Image quality metrics measure the distortion between a reference image and an image that has been modified, such as a pan-sharpened image. Quality metrics in `geeSharp` follow the pattern below.

```javascript
quality.Metric.calculate(originalImage, modifiedImage)
```

Most quality metrics just require an unmodified and a modified image and return a dictionary mapping band names to metric values, but some metrics require other parameters (e.g. `ERGAS` requires the high and low spectral resolution) and some return a single image-wise value (e.g. `RASE` and `ERGAS`). See the [documentation](https://github.com/aazuspan/geeSharp.js/wiki/Image-Quality-Assessment) for detailed descriptions of image quality assessment functions.

#### Example

```javascript
// Load the image quality functions
var quality = require("users/aazuspan/geeSharp:quality.js");

// Calculate the error introduced by sharpening
print(quality.RMSE.calculate(unsharpened.resample("bicubic").reproject(sharpened.projection()), sharpened));
```

Note that quality metrics are affected by spatial resolution, so when comparing unsharpened and pan-sharpened images, always resample and reproject the unsharpened image to high resolution first to ensure an accurate comparison!

## Accuracy

| Function   | Algorithm                    |    MSE |    Q |  RASE | ERGAS |
| :--------- | :--------------------------- | -----: | ---: | ----: | ----: |
| GS         | Gram-Schmidt                 | 0.0001 | 0.96 | 11.69 |  6.02 |
| PCA        | Principal Component Analysis | 0.0001 | 0.96 | 11.64 |  6.00 |
| SimpleMean | Simple mean                  | 0.0001 | 0.95 |  9.79 |  4.82 |
| brovey     | Brovey                       | 0.0003 | 0.94 | 18.01 | 11.50 |
| HPFA       | High-Pass Filter (Additive)  | 0.0004 | 0.91 | 20.78 | 16.96 |
| IHS        | Intensity-Hue-Saturation     | 0.0005 | 0.91 | 23.25 | 22.32 |

\*Accuracies were calculated by sharpening the RGB bands of Landsat 8 TOA data, and represent the mean distortion for all bands. Accuracy will change based on scene and band selection.

## Disclaimer

- There is no guarantee of accuracy in this library. I would strongly recommend validating results against an established tool such as GDAL or SAGA GIS.
- Functions are designed for and tested with Landsat 8 TOA data. They should be usable with other data sources, but may require modification.
- Most sharpening functions will accept input images with any number of bands. However, algorithm accuracy may depend on spectral overlap between input bands and the panchromatic band. Make sure that the sharpening algorithm you select is compatible with your input imagery.

## References

- Gangkofner, U. G., Pradhan, P. S., & Holcomb, D. W. (2007). Optimizing the High-Pass Filter Addition Technique for Image Fusion. Photogrammetric Engineering & Remote Sensing, 73(9), 1107–1118. doi:10.14358/pers.73.9.1107
- Hagag, A., Amin, M., & Abd El-Samie, F. E. (2013). Multispectral image compression with band ordering and wavelet transforms. Signal, Image and Video Processing, 9(4), 769–778. doi:10.1007/s11760-013-0516-4
- Hallabia, H., Kallel, A., & Ben Hamida, A. (2014). Image pansharpening: Comparison of methods based on multiresolution analysis and component substitution. 2014 1st International Conference on Advanced Technologies for Signal and Image Processing (ATSIP). doi:10.1109/atsip.2014.6834602
- Vaiopoulos, A. D. (2011). Developing Matlab scripts for image analysis and quality assessment. Earth Resources and Environmental Remote Sensing/GIS Applications II. doi:10.1117/12.897806
- Zhou Wang, & Bovik, A. C. (2002). A universal image quality index. IEEE Signal Processing Letters, 9(3), 81–84. doi:10.1109/97.995823
