// Grindavik
var grindavik = table
var timePeriods = [
    { start: '2023-08-20', end: '2023-08-30' }, 
    { start: '2023-12-22', end: '2024-01-14' }, 
    { start: '2024-01-17', end: '2024-02-08' },  
    { start: '2024-03-01', end: '2024-03-10' }, 
    { start: '2024-05-09', end: '2024-06-22' },  
    { start: '2024-06-25', end: '2024-06-28' },  
    { start: '2024-09-24', end: '2024-09-30' },   
    { start: '2024-12-30', end: '2025-03-30' },  
    { start: '2025-04-10', end: '2025-04-20' } 
];

var trainingPoints = lava5.merge(nolava1)

var training3 = lava3.merge(nolava1)
var training5 = lava5.merge(nolava1)
var training6 = lava6.merge(nolava1)
var training8 = lava8.merge(nolava1)


//detectLavaChange(timePeriods[0], timePeriods[3], training3, validationBeforeGrindavik, grindavik)
//detectLavaChange(timePeriods[0], timePeriods[5], training5, validationBeforeGrindavik, grindavik)
//detectLavaChange(timePeriods[0], timePeriods[6], training6, validationBeforeGrindavik, grindavik)
//detectLavaChange(timePeriods[0], timePeriods[7], training7, validationBeforeGrindavik, grindavik)
//detectLavaChange(timePeriods[0], timePeriods[8], training8, validationBeforeGrindavik, grindavik)

// La Palma
var timePeriodsPalma = [
    { start: '2021-08-20', end: '2021-08-22' },  // Vor der Eruption
    { start: '2022-02-16', end: '2022-02-18' }   // Nach dem Ende der Eruption
];

var trainingPalma = lapalma_lava.merge(lapalma_nolava)
//detectLavaChange(timePeriodsPalma[0], timePeriodsPalma[1], trainingPalma, lapalma_validationBefore, lapalma)

function detectLavaChange(prePeriod, postPeriod, trainingValidationData, validationBefore, aoi) {
    Map.centerObject(aoi, 12);
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

    // Erstellung einer S2 Image collection
    var s2_collection_all = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterDate(ee.Date(prePeriod.start), ee.Date(postPeriod.end))
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
        //.map(maskS2clouds)
        .filterBounds(aoi);

    print(s2_collection_all);


    // Vor Eruption
    var s2_collection_pre = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterDate(ee.Date(prePeriod.start), ee.Date(prePeriod.end))
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
        .map(maskS2clouds)
        .filterBounds(aoi);

    print('Bilder vor Eruption:', s2_collection_pre);

    // Nach Eruption
    var s2_collection_post = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterDate(ee.Date(postPeriod.start), ee.Date(postPeriod.end))
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
        .map(maskS2clouds)
        .filterBounds(aoi);

    // Aggregation mit Mittelwert   
    var preImage = s2_collection_pre.mean().clip(aoi)
    var postImage = s2_collection_post.mean().clip(aoi)

    // Auswahl der Bänder
    preImage = preImage.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);
    postImage = postImage.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);

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
    Map.addLayer(preImage, rgbVisParams, 'RGB Vor Eruption', false);
    Map.addLayer(postImage, rgbVisParams, 'RGB Nach Eruption', false);

    // Falschfarbe zu Karte hinzufügen
    Map.addLayer(preImage, falseColorVisParams, 'False Color Pre Eruption', false);
    Map.addLayer(postImage, falseColorVisParams, 'False Color Post Eruption', false);


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

    var pre_4_Bands = preImage.select('B8', 'B4', 'B3', 'B2');
    var post_4_Bands = postImage.select('B8', 'B4', 'B3', 'B2');

    var pcImagePre = getPrincipalComponents(pre_4_Bands, 10, aoi)
    var pcImagePost = getPrincipalComponents(post_4_Bands, 10, aoi);

    Map.addLayer(pcImagePre, { min: -2, max: 2 }, 'PC Pre', false);
    Map.addLayer(pcImagePost, { min: -2, max: 2 }, 'PC Post', false);





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

    Map.addLayer(calculateMineralComposite(preImage), { min: 0.5, max: 2 }, 'Mineral_Composite', false);
    Map.addLayer(calculateMineralComposite(postImage), { min: 0.5, max: 2 }, 'Mineral_Composite', false);

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
    Map.addLayer(calculateNDVI(preImage), { min: 0, max: 1 }, 'NDVI Pre', false);
    Map.addLayer(calculateNDVI(postImage), { min: 0, max: 1 }, 'NDVI Post', false);



    // --------------------------------------------------Classify
    var selectedBandsPre = preImage.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);
    var selectedBandsPost = postImage.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);

    var classificationCompositeBefore = selectedBandsPre.addBands(pcImagePre).addBands(calculateMineralComposite(preImage)).addBands(calculateNDVI(preImage))
    var classificationCompositeAfter = selectedBandsPost.addBands(pcImagePost).addBands(calculateMineralComposite(postImage)).addBands(calculateNDVI(postImage))


    function trainClassifier(image, trainingValidationData, classProperty, numTrees) {
        var sample = trainingValidationData.randomColumn();
        var trainingSample = sample.filter(ee.Filter.lte('random', 0.7));

        var training = image.sampleRegions({
            collection: trainingSample,
            properties: [classProperty],
            scale: 10
        });

        var classifier = ee.Classifier.smileRandomForest(numTrees)
            .train({
                features: training,
                classProperty: classProperty
            });

        return classifier;
    }

    function classifyImage(image, classifier, validationData, classProperty) {
        var classified = image.classify(classifier);

        var validation = classified.sampleRegions({
            collection: validationData,
            properties: [classProperty],
            scale: 10
        });

        var errorMatrix = validation.errorMatrix({
            actual: classProperty,
            predicted: 'classification'
        });

        return {
            classified: classified,
            errorMatrix: errorMatrix
        };
    }

    var sample = trainingValidationData.randomColumn();
    var trainingSample = sample.filter(ee.Filter.lte('random', 0.7));
    var validationSampleAfter = sample.filter(ee.Filter.gt('random', 0.7));
    var validationSampleBefore = validationBefore;
    var classifier = trainClassifier(classificationCompositeAfter, trainingSample, 'landcover', 100);

    // Klassifizieren
    var classificationResultsBefore = classifyImage(classificationCompositeBefore, classifier, validationSampleBefore, 'landcover');
    var classificationResultsAfter = classifyImage(classificationCompositeAfter, classifier, validationSampleAfter, 'landcover');

    // Klassifizierte Bilder 
    var classifiedImageBefore = classificationResultsBefore.classified;
    var classifiedImageAfter = classificationResultsAfter.classified;

    // Error Matrizen
    var errorMatrixBefore = classificationResultsBefore.errorMatrix;
    var errorMatrixAfter = classificationResultsAfter.errorMatrix;

    // Genauigkeitsmetriken: Pre-Eruption
    print('--- Pre-Eruption Evaluation ---');
    print('Confusion Matrix (Pre):', errorMatrixBefore);
    print('Overall Accuracy (Pre):', errorMatrixBefore.accuracy());
    print('Kappa (Pre):', errorMatrixBefore.kappa());
    print('User Accuracy (Pre):', errorMatrixBefore.consumersAccuracy());
    print('Producer Accuracy (Pre):', errorMatrixBefore.producersAccuracy());

    // Genauigkeitsmetriken: Post-Eruption
    print('--- Post-Eruption Evaluation ---');
    print('Confusion Matrix (Post):', errorMatrixAfter);
    print('Overall Accuracy (Post):', errorMatrixAfter.accuracy());
    print('Kappa (Post):', errorMatrixAfter.kappa());
    print('User Accuracy (Post):', errorMatrixAfter.consumersAccuracy());
    print('Producer Accuracy (Post):', errorMatrixAfter.producersAccuracy());

    var explanation = classifier.explain();

    var importance = ee.Dictionary(explanation.get('importance'));

    var keys = importance.keys();

    var table = ee.FeatureCollection(keys.map(function (k) {
        return ee.Feature(null, {
            'Band': k,
            'Wichtigkeit': importance.get(k)
        });
    }));

    var chart3 = ui.Chart.feature.byFeature({
        features: table,
        xProperty: 'Band',  // Jetzt Bandnamen auf der Achse!
        yProperties: ['Wichtigkeit']
    }).setChartType('ColumnChart')
        .setOptions({
            title: 'Merkmalswichtigkeit der Segmentmittelwerte',
            hAxis: {
                title: 'Segmentmittelwerte basierend auf Polarisierungen und deren Kombinationen',
                slantedText: true,
                slantedTextAngle: 45,
                titleTextStyle: { italic: false, bold: true }
            },
            vAxis: {
                title: 'Wichtigkeit',
                titleTextStyle: { italic: false, bold: true }
            },
            legend: { position: 'none' },
            colors: ['1f77b4']
        });

    print(chart3);

    // Ausgabe der Feature Importance
    print('Feature Importance:', importance);

    Map.addLayer(classifiedImageBefore, { min: 0, max: 1, palette: ['white', 'red'] }, 'Classified Before-Eruption');
    Map.addLayer(classifiedImageAfter, { min: 0, max: 1, palette: ['white', 'red'] }, 'Classified After-Eruption');



    // Berechnung der Differenz 
    var classificationDifference = classifiedImageAfter.subtract(classifiedImageBefore);

    var diffMask = classificationDifference.eq(1);

    // Fläche jedes Pixels in m²
    var pixelArea = ee.Image.pixelArea();

    var changedAreaImage = pixelArea.updateMask(diffMask);

    var area = changedAreaImage.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: aoi,   // deine ROI
        scale: 10,          // oder passender Maßstab je nach Daten
        maxPixels: 1e13
    });

    print('Veränderte Fläche in m²:', area);
    // Visualisierungsparameter für die Differenzkarte
    var diffVisParams = {
        min: -3,
        max: 3,
        palette: ['white', 'black', 'orange']
    };

    // Anzeige der Klassifikationsdifferenz
    Map.addLayer(classificationDifference, diffVisParams, 'Classification Difference');
}
