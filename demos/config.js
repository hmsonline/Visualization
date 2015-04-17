require.config({
    baseUrl: "../dist/build",
    paths: {
        'async': '../../demos/bower_components/requirejs-plugins/src/async',
        'css': '../../demos/bower_components/require-css/css',
        'text': '../../demos/bower_components/text/text',
        'goog': '../../demos/bower_components/requirejs-plugins/src/goog',
        'propertyParser': '../../demos/bower_components/requirejs-plugins/src/propertyParser',

        'lodash': '../../demos/bower_components/lodash/dist/lodash',
        'graphlib': '../../demos/bower_components/graphlib/dist/graphlib.core',
        'd3-cloud': '../../demos/bower_components/d3-cloud',
        'topojson': '../../demos/bower_components/topojson',
        'font-awesome': '../../demos/bower_components/font-awesome',
        'dagre/dagre': '../../demos/bower_components/dagre/dist/dagre.core',
        'colorbrewer': '../../demos/bower_components/colorbrewer'
    },
    packages: [
        {
            name: 'd3',
            location: '../../demos/bower_components/d3',
            main: 'd3'
        },
        {
            name: 'c3',
            location: '../../demos/bower_components/c3',
            main: 'c3'
        }
    ]
});
