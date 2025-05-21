var grindavik = table
var timePeriods = [
    { start: '2023-07-01', end: '2023-11-30' },
    { start: '2024-02-07', end: '2024-02-29' },
    { start: '2024-06-06', end: '2024-06-08' }
];

detectEruptionFissure(timePeriods[0], geometry)

function detectEruptionFissure(prePeriod, roi) {
    // Erstellung einer S1 Image Collection 
    var s1_collection_all = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filterBounds(roi)
        .filterDate(ee.Date(prePeriod.start), ee.Date(prePeriod.end))
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
        .select(['VV', 'VH'])

    print(s1_collection_all)


    // Vor Eruption IC
    var s1_collection_pre = s1_collection_all
        .filterDate(ee.Date(prePeriod.start), ee.Date(prePeriod.end));
    print(s1_collection_pre)

    // Aggregation mit Mittelwert    
    var preImage = s1_collection_pre.mean().clip(roi);

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

    preImage = calculate_VV_VH_Ratios(preImage);



    function applyConvolution(image, kernel) {
        var edges = image.convolve(kernel);
        return edges;
    }
    var diagonalSobel = ee.Kernel.fixed(3, 3, [
        [-2, -1, 0],
        [-1, 0, 1],
        [0, 1, 2]
    ]);


    var edgesSobel = applyConvolution(preImage, diagonalSobel)
    Map.addLayer(edgesSobel, {}, 'Sobel');
    Map.centerObject(roi, 10);
}