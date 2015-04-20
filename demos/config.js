var debug_mode = false;
var lib_folder = debug_mode ? "../bower_components" : "../dist/amd/lib";
var third_party_folder = debug_mode ? "../third_party" : "../dist/amd/lib";
var src_folder = debug_mode ? "../src" : "../dist/amd/src";

require.config({
    baseUrl: ".",
    paths: {
        'async': '../bower_components/requirejs-plugins/src/async',
        'css': '../bower_components/require-css/css',
        'text': '../bower_components/text/text',
        'goog': '../bower_components/requirejs-plugins/src/goog',
        'propertyParser': '../bower_components/requirejs-plugins/src/propertyParser',

        'dagre': third_party_folder + "/dagre",
        'topojson': lib_folder + "/topojson",
        'colorbrewer': lib_folder + "/colorbrewer",
        'd3-cloud': lib_folder + "/d3-cloud",
        'font-awesome': lib_folder + "/font-awesome"
    },
    packages: [
        {
            name: 'd3',
            location: lib_folder + "/d3",
            main: "d3"
        },
        {
            name: 'c3',
            location: lib_folder + "/c3",
            main: "c3"
        },
        {
            name: 'viz',
            location: src_folder
        }
    ]
});
