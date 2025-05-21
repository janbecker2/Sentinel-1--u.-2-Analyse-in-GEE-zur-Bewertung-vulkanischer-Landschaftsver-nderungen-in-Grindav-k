var grindavik = geometry

var timePeriods = [
    { start: '2023-09-01', end: '2023-10-01' }, 
    { start: '2023-12-22', end: '2023-12-30' },  
    { start: '2024-01-14', end: '2024-01-30' },  
    { start: '2024-03-05', end: '2024-03-15' },  
    { start: '2024-05-09', end: '2024-06-10' },  
    { start: '2024-06-25', end: '2024-06-30' },  
    { start: '2024-09-15', end: '2024-09-30' },   
    { start: '2024-12-09', end: '2025-03-30' },
    { start: '2025-04-02', end: '2025-04-30' }
];


var training4 = lava4.merge(no_lava4);
var newe = lava4.merge(no_lava4);
var training1 = lava1.merge(no_lava1);
var training2 = lava2.merge(no_lava2);
var training3 = lava3.merge(no_lava3);
var training6 = lava6.merge(no_lava6);
var training8 = lava8.merge(no_lava8);

//Eruption 1 
detectLavaChange(timePeriods[0], timePeriods[1], Training_Eruption_1, grindavik)

//Eruption 2 
//detectLavaChange(timePeriods[0], timePeriods[2], training2, grindavik) 

//Eruption 3 
//detectLavaChange(timePeriods[0], timePeriods[3], training3, grindavik)

//Eruption 4
//detectLavaChange(timePeriods[0], timePeriods[4], training4, grindavik)

//Eruption 5
//detectLavaChange(timePeriods[0], timePeriods[5], Training_Eruption_5, grindavik)

//Eruption 6
//detectLavaChange(timePeriods[0], timePeriods[6], training6, grindavik)

//Eruption 7 
//detectLavaChange(timePeriods[0], timePeriods[7], Training_Eruption_7, grindavik)

//Eruption 8 
//detectLavaChange(timePeriods[0], timePeriods[8], training8, grindavik)

function detectLavaChange(prePeriod, postPeriod, trainingData, roi) {
    Map.centerObject(roi, 10);
    // Erstellung einer S1 Image Collection 
    var s1_collection_all = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filterBounds(roi)
        .filterDate(ee.Date(prePeriod.start), ee.Date(postPeriod.end))
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
        .select(['VV', 'VH'])

    print(s1_collection_all)

    // Vor Eruption IC
    var s1_collection_pre = s1_collection_all
        .filterDate(ee.Date(prePeriod.start), ee.Date(prePeriod.end));

    // Nach Eruption IC
    var s1_collection_post = s1_collection_all
        .filterDate(ee.Date(postPeriod.start), ee.Date(postPeriod.end));

    // Aggregation mit Mittelwert    
    var preImage = s1_collection_pre.mean().clip(roi);
    var postImage = s1_collection_post.mean().clip(roi);

    function calculate_VV_VH_Ratios(image) {
        var VV = image.select('VV');
        var VH = image.select('VH');

        var sub = VV.subtract(VH).rename('VV_VH_sub');
        var sub_quad = VV.pow(2).subtract(VH.pow(2)).rename('VV_VH_sub_quad');
        var add = VV.add(VH).rename('VV_VH_add');
        var add_quad = VV.pow(2).add(VH.pow(2)).rename('VV_VH_add_quad');
        var mult = VV.multiply(VH).rename('VV_VH_mult');
        var mult_quad = VV.pow(2).multiply(VH.pow(2)).rename('VV_VH_mult_quad');

        return image.select(['VV', 'VH'])
            .addBands([sub, sub_quad, add, add_quad, mult, mult_quad]);
    }

    // Create new bands
    preImage = calculate_VV_VH_Ratios(preImage);
    postImage = calculate_VV_VH_Ratios(postImage);

    function calculateDifference(preImage, postImage) {
        var difference = (postImage.subtract(preImage));
        return difference;
    }


    var difference = calculateDifference(preImage, postImage);

    Map.addLayer(preImage, { min: -20, max: 0 }, "Pre-Event Sentinel-1", false);

    Map.addLayer(postImage, { min: -20, max: 0 }, "Post-Event Sentinel-1", false);
    Map.addLayer(difference, { min: -20, max: 0 }, "Difference Sentinel-1", false);
    Map.addLayer(postImage.subtract(preImage), { min: -20, max: 0 }, "Difference 1 Sentinel-1", false);


    // Funktion zur Berechnung der optimalen SNIC size
    function optimizeSNICSize(difference, trainingData, minSize, maxSize, stepSize) {

        // Erselle sequenz mit übergebenen Größen
        var sizes = ee.List.sequence(minSize, maxSize, stepSize);

        // Wende accuracy Funktion auf alle Größen an
        var accuracyResults = sizes.map(function (size) {

            // SNIC Segmentation
            var snic = ee.Algorithms.Image.Segmentation.SNIC({
                image: difference,
                size: size,
                compactness: 0.01,
                connectivity: 8
            });

            // Reduce segments to mean values
            var snicMean = snic.reduceConnectedComponents({
                reducer: ee.Reducer.mean(),
                labelBand: 'clusters'
            });

            // Klassifikation
            // Schritt 1: Trainingsdaten zufällig aufteilen (70% Training, 30% Validierung)
            var sample = trainingData.randomColumn();
            var trainingSample = sample.filter(ee.Filter.lte('random', 0.7));
            var validationSample = sample.filter(ee.Filter.gt('random', 0.7));

            // Schritt 2: Classifier trainieren
            var classifier = trainClassifier(snicMean, trainingSample, 'landcover', 100);

            // Schritt 3: Klassifikation durchführen und validieren
            var classificationResults = classifyImage(snicMean, classifier, validationSample, 'landcover');

            // Kappa-Index
            var errorMatrix = classificationResults.errorMatrix;
            var kappa = errorMatrix.kappa();

            return ee.Feature(null, {
                'size': size,
                'kappa': kappa
            });
        });

        var accuracyFC = ee.FeatureCollection(accuracyResults);

        // Wertepaar mit größtem Kappa-Index finden
        var optimalResult = accuracyFC.sort('kappa', false).first();

        // Gebe beste SNIC size Größe zurück
        return optimalResult.get('size');
    }

    // Anwenden der Funtion
    var optimalSize = optimizeSNICSize(
        difference,     // Input difference image
        trainingData,   // Training points
        20,             // Minimum size to test
        50,             // Maximum size to test
        5               // Step size between tests
    );

    print(optimalSize)

    // Anwendung des SNIC Algorithmus
    var snic = ee.Algorithms.Image.Segmentation.SNIC({
        image: difference,
        size: optimalSize,
        compactness: 0.01,
        connectivity: 8
    });

    var snicMean = snic.reduceConnectedComponents({
        reducer: ee.Reducer.mean(),
        labelBand: 'clusters'
    });
    Map.addLayer(snicMean, {}, 'Snic Mean')

    function trainClassifier(image, trainingSample, classProperty, numTrees) {

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

    print("Classification Composite Bands:", snicMean.bandNames());

    var sample = trainingData.randomColumn();
    var trainingSample = sample.filter(ee.Filter.lte('random', 0.7));
    var validationSample = sample.filter(ee.Filter.gt('random', 0.7));

    var classifier = trainClassifier(snicMean, trainingSample, 'landcover', 100);

    var classificationResults = classifyImage(snicMean, classifier, validationSample, 'landcover');


    var classifiedImage = classificationResults.classified;

    Map.addLayer(classifiedImage, { min: 0, max: 1, palette: ['white', 'red'] }, 'Classified 10m');

    var errorMatrix = classificationResults.errorMatrix;
    //var classifier =  classificationResults.classifier   
    var explanation = classifier.explain();
    var importance = ee.Dictionary(explanation.get('importance'));

    // FI anzeigen
    var keys = importance.keys();

    var filteredKeys = keys.remove('seeds');

    var table = ee.FeatureCollection(filteredKeys.map(function (k) {
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
    print('Feature Importance:', importance);


    // Gesamtgenauigkeit
    var overallAccuracy = errorMatrix.accuracy();

    // Kappa-Koeffizient
    var kappa = errorMatrix.kappa();

    // Produzenten- und Nutzer-Genauigkeit (Producer & User Accuracy)
    var producersAccuracy = errorMatrix.producersAccuracy();
    var usersAccuracy = errorMatrix.consumersAccuracy();

    print('Fehler-Matrix:', errorMatrix);
    print('Gesamtgenauigkeit (Overall Accuracy):', overallAccuracy);
    print('Kappa-Koeffizient:', kappa);
    print('Produzenten-Genauigkeit (Producers Accuracy):', producersAccuracy);
    print('Nutzer-Genauigkeit (Users Accuracy):', usersAccuracy);

    var lava_mask = classifiedImage.eq(1);
    var areaImage = ee.Image.pixelArea().updateMask(lava_mask);

    var binaryMask = areaImage.gt(0);

    var areaPerClass = areaImage.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: roi,
        scale: 10,
    });

    var areaInMeters = ee.Number(areaPerClass.get('area'));
    print('Gesamtfläche der Klasse 1 (m²):', areaInMeters);
}