# geeSharpening
A library for pan-sharpening multispectral imagery in Google Earth Engine
 ![Example image](https://raw.githubusercontent.com/aazuspan/geeSharpening/main/sharpening_example.png)
 
## Installation
- Visit https://code.earthengine.google.com/?accept_repo=users/aazuspan/geeSharpening. This will link the library to your GEE account, allowing you to import functions.
- Import sharpening algorithms by including `var sharpening = require('users/aazuspan/geeSharpening:sharpening');` in your script.

## Usage
- To sharpen an image, call the appropriate sharpening function
  - `sharpening.PCA.sharpen()`
  - `sharpening.brovey.sharpen()`
  - `sharpening.IHS.sharpen()`
  - `sharpening.simpleMean.sharpen()`
- Pass the appropriate arguments for your imagery. See `example.js` for example usage, or read the source code documentation.
  
## Disclaimer
- There is no guarantee of accuracy in this library. I would strongly recommend validating results against an established tool such as GDAL or SAGA GIS.
- Functions are designed for and tested with Landsat 8 TOA data. They should be usable with other data sources, but may require modification.

## Contributing
- Pull requests and issues are welcome!
