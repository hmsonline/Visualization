requirejs.config({
    baseUrl: "../src",
    packages: [
        {
            name: "d3",
            location: "../bower_components/d3",
            main: "d3"
        },
        {
            name: "c3",
            location: "../bower_components/c3",
            main: "c3"
        },
        {
            name: "crossfilter",
            location: "../bower_components/crossfilter",
            main: "crossfilter"
        },
        {
            name: "lodash",
            location: "../bower_components/lodash",
            main: "lodash"
        },
        {
            name: "topojson",
            location: "../bower_components/topojson",
            main: "topojson"
        }
    ]
});
