requirejs.config({
    baseUrl: ".",
    packages: [
        {
            name: "d3",
            location: "d3",
            main: "d3"
        },
        {
            name: "c3",
            location: "c3",
            main: "c3"
        },
        {
            name: "crossfilter",
            location: "crossfilter",
            main: "crossfilter"
        },
        {
            name: "lodash",
            location: "lodash",
            main: "lodash"
        },
        {
            name: "topojson",
            location: "topojson",
            main: "topojson"
        }
    ]
});
