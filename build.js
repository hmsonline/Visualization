({
    baseUrl: 'src',
    mainConfigFile: 'src/config.js',
    out: 'dist/vis.min.js',
    include: [
      'chart/Bubble.js'
    ],
    paths: {
      'c3': 'empty:',
      'colorbrewer': 'empty:',
      'lib/colorbrewer': 'empty:',
      'crossfilter': 'empty:',
      'd3': 'empty:',
      'dagre': 'empty:',
      'font-awesome': 'empty:',
      'lodash': 'empty:',
      'topojson': 'empty:',
      'd3-cloud': 'empty:'
    }
})
