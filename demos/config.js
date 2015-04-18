require.config({
    baseUrl: ".",
    paths: {
        'async': '../bower_components/requirejs-plugins/src/async',
        'css': '../bower_components/require-css/css',
        'text': '../bower_components/text/text',
        'goog': '../bower_components/requirejs-plugins/src/goog',
        'propertyParser': '../bower_components/requirejs-plugins/src/propertyParser',

        'lodash': '../bower_components/lodash/dist/lodash',
        'graphlib': '../bower_components/graphlib/dist/graphlib.core',
        'd3-cloud': '../bower_components/d3-cloud',
        'topojson': '../bower_components/topojson',
        'font-awesome': '../bower_components/font-awesome',
        'dagre/dagre': '../bower_components/dagre/dist/dagre.core',
        'colorbrewer': '../bower_components/colorbrewer'
    },
    packages: [
        {
            name: 'd3',
            location: '../bower_components/d3',
            main: 'd3'
        },
        {
            name: 'c3',
            location: '../bower_components/c3',
            main: 'c3'
        },
        {
            name: 'viz',
            location: '../viz'
        }
    ]
});
