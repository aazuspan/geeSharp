# geeSharpening
Pan-sharpen multispectral imagery in GEE with one line of code:
```
var panSharpened = sharpening.PCA.sharpen(img.select(["B4", "B3", "B2",]), img.select(["B8"]);
```
 ![Example image](https://raw.githubusercontent.com/aazuspan/geeSharpening/main/sharpening_example.png)
 
## Installation
- Visit https://code.earthengine.google.com/?accept_repo=users/aazuspan/geeSharpening. This will link the library to your GEE account, allowing you to import functions.
- Import sharpening functions by including `var sharpening = require("users/aazuspan/geeSharpening:sharpening");` in your script.

## Usage
- To sharpen an image, call the appropriate sharpening function
  - `sharpening.PCA.sharpen(input, pan)`
  - `sharpening.GS.sharpen(input, pan)`
  - `sharpening.brovey.sharpen(input, pan, weights?)`
  - `sharpening.IHS.sharpen(input, pan)`
  - `sharpening.HPFA.sharpen(input, pan, kernelWidth?)`
  - `sharpening.simpleMean.sharpen(input, pan)`
- Pass the appropriate arguments for your imagery. See source code documentation for more info about each function's parameters.

### Example
```
// Load the sharpening library
var sharpening = require('users/aazuspan/geeSharpening:sharpening');

// Select an example Landsat 8 TOA image to sharpen
var inputImg = ee.Image("LANDSAT/LC08/C01/T1_TOA/LC08_047027_20160819");

// Select the 30 m spectral bands to sharpen
var inputBands = inputImg.select(["B4", "B3", "B2"]);

// Select the 15 m panchromatic band
var panBand = inputImg.select(["B8"]);

// Pan-sharpen using PCA
var sharpenedImg = sharpening.PCA.sharpen(inputBands, panBand);
```
  
## Disclaimer
- There is no guarantee of accuracy in this library. I would strongly recommend validating results against an established tool such as GDAL or SAGA GIS.
- Functions are designed for and tested with Landsat 8 TOA data. They should be usable with other data sources, but may require modification.
- Most sharpening functions will accept input images with any number of bands. However, algorithm accuracy may depend on spectral overlap between input bands and the panchromatic band. Make sure that the sharpening algorithm you select is compatible with your input imagery. 

## Contributing
- Pull requests and issues are welcome!

## References
* Gangkofner, U. G., Pradhan, P. S., & Holcomb, D. W. (2007). Optimizing the High-Pass Filter Addition Technique for Image Fusion. Photogrammetric Engineering & Remote Sensing, 73(9), 1107–1118. doi:10.14358/pers.73.9.1107 
* Hallabia, H., Kallel, A., & Ben Hamida, A. (2014). Image pansharpening: Comparison of methods based on multiresolution analysis and component substitution. 2014 1st International Conference on Advanced Technologies for Signal and Image Processing (ATSIP). doi:10.1109/atsip.2014.6834602 


