var timePeriods = [
    { start: '2023-08-20', end: '2023-08-30' },
    { start: '2024-02-07', end: '2024-02-13' },
    { start: '2024-06-06', end: '2024-06-08' }

];

detectEruptionFissure(timePeriods[0], geometry)

function detectEruptionFissure(prePeriod, aoi) {
    // Function to mask clouds using the Sentinel-2 QA band.
    function maskS2clouds(image) {
        var qa = image.select('QA60');

        // Bits 10 and 11 are clouds and cirrus, respectively.
        var cloudBitMask = 1 << 10;
        var cirrusBitMask = 1 << 11;

        // Both flags should be set to zero, indicating clear conditions.
        var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
            .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

        return image.updateMask(mask).divide(10000);
    }
    // Nach Eruption
    var s2_collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterDate(ee.Date(prePeriod.start), ee.Date(prePeriod.end))
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
        //.map(maskS2clouds)
        .filterBounds(aoi);

    // Aggregation mit Mittelwert   
    var image = s2_collection.mean().clip(aoi)

    // Auswahl der Bänder
    image = image.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);

    // RGB vis Para
    var rgbVisParams = {
        min: 0.0,
        max: 0.3,
        bands: ['B4', 'B3', 'B2'],
        gamma: 1.4
    };

    // Falschfarbe vis Para
    var falseColorVisParams = {
        min: 0.0,
        max: 0.2,
        bands: ['B8', 'B4', 'B3'],
        gamma: 1.2
    };

    // RGB zu Karte hinzufügen
    Map.addLayer(image, rgbVisParams, 'RGB Nach Eruption', false);

    // Falschfarbe zu Karte hinzufügen
    Map.addLayer(image, falseColorVisParams, 'False Color Pre Eruption', false);


    // --------------------------------------------------------------------------PC
    var bandNames = ee.List([
        'B2',   // Blue
        'B3',   // Green
        'B4',   // Red
        'B8'    // NIR
    ]);


    var getPrincipalComponents = function (centered, scale, region) {
        // Collapse the bands of the image into a 1D array per pixel.
        var arrays = centered.toArray();

        // Compute the covariance of the bands within the region.
        var covar = arrays.reduceRegion({
            reducer: ee.Reducer.centeredCovariance(),
            geometry: region,
            scale: scale,
            maxPixels: 1e9
        });

        // Get the 'array' covariance result and cast to an array.
        // This represents the band-to-band covariance within the region.
        var covarArray = ee.Array(covar.get('array'));

        // Perform an eigen analysis and slice apart the values and vectors.
        var eigens = covarArray.eigen();

        // This is a P-length vector of Eigenvalues.
        var eigenValues = eigens.slice(1, 0, 1);
        // This is a PxP matrix with eigenvectors in rows.
        var eigenVectors = eigens.slice(1, 1);

        // Convert the array image to 2D arrays for matrix computations.
        var arrayImage = arrays.toArray(1);

        // Left multiply the image array by the matrix of eigenvectors.
        var principalComponents = ee.Image(eigenVectors).matrixMultiply(arrayImage);

        var getNewBandNames = function (name) {
            var count = bandNames.length();
            var seq = ee.List.sequence(1, count);

            var newBandNames = seq.map(function (b) {
                var bandNumber = ee.Number(b).int();
                var bandName = ee.String(name).cat(bandNumber);
                return bandName;
            });

            return newBandNames;
        };

        // Turn the square roots of the Eigenvalues into a P-band image.
        var sdImage = ee.Image(eigenValues.sqrt())
            .arrayProject([0]).arrayFlatten([getNewBandNames('sd')]);

        // Turn the PCs into a P-band image, normalized by SD.
        return principalComponents
            // Throw out an an unneeded dimension, [[]] -> [].
            .arrayProject([0])
            // Make the one band array image a multi-band image, [] -> image.
            .arrayFlatten([getNewBandNames('pc')])
            // Normalize the PCs by their SDs.
            .divide(sdImage);
    };

    var image_4_Bands = image.select('B8', 'B4', 'B3', 'B2');
    var pcImage = getPrincipalComponents(image_4_Bands, 10, aoi);

    Map.addLayer(pcImage, { min: -2, max: 2 }, 'PC Pre', false);

    //-----------------------------------------------Indizes:
    //Mineral Composite
    var calculateMineralComposite = function (image) {
        // Zuweisung der Bänder
        var swir1 = image.select('B11'); // SWIR1
        var swir2 = image.select('B12'); // SWIR2
        var nir = image.select('B8');   // NIR
        var red = image.select('B4');   // Red
        var blue = image.select('B2');  // Blue

        // Berechnung der Indizes
        var swir1_swir2 = swir1.divide(swir2);
        var swir1_nir = swir1.divide(nir);
        var red_blue = red.divide(blue);

        // Zusammenfügen zu Komposit
        var mineralComposite = swir1_swir2
            .addBands(swir1_nir)
            .addBands(red_blue)
            .rename(['SWIR1_SWIR2', 'SWIR1_NIR', 'Red_Blue']);

        return mineralComposite
    }

    Map.addLayer(calculateMineralComposite(image), { min: 0.5, max: 2 }, 'Mineral_Composite', false);

    var calculateNDVI = function (image) {
        // Zuweisung der Bänder
        var nir = image.select('B8');   // NIR
        var red = image.select('B4');   // Red
        var blue = image.select('B2');  // Blue
        var green = image.select('B3'); // Green
        var swir1 = image.select('B11'); // SWIR1

        // Berechnung der Indizes
        var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');

        // Erstellen des NDVI Bildes
        var ndviImage = ndvi.rename('NDVI');

        return ndviImage;
    };
    Map.addLayer(calculateNDVI(image), { min: 0, max: 1 }, 'NDVI Pre', false);

    var selectedBands = image.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);

    var composite = selectedBands.addBands(pcImage).addBands(calculateMineralComposite(image)).addBands(calculateNDVI(image))
    Map.addLayer(composite, falseColorVisParams, 'False Color Pre Eruption All', false);

    function applyConvolution(image, kernel) {
        var edges = image.convolve(kernel);
        return edges;
    }
    var diagonalSobel = ee.Kernel.fixed(3, 3, [
        [-2, -1, 0],
        [-1, 0, 1],
        [0, 1, 2]
    ]);


    var edgesSobel = applyConvolution(composite, diagonalSobel)

    Map.addLayer(edgesSobel, {}, 'Sobel');


}
