const gulp = require('gulp');
const _ = require('lodash');
const async = require('async');
const rjs = require('requirejs');

gulp.task('default', function (done) {
  const opts = {
    baseUrl: '.',
    paths: {
      // plugins
      'async': 'requirejs/plugins/async',
      'css': 'requirejs/plugins/css',
      'text': 'requirejs/plugins/text',
      'goog': 'requirejs/plugins/goog',
      'propertyParser': 'requirejs/plugins/propertyParser',

      // vendors
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
    },
    include: [
      // TODO: load all scripts
      'src/other/Table'
    ],
  };

  // TODO: strip out all plugins, e.g. css!

  async.parallel([
    optimize.bind(null, _.extend({out: 'dist/vis.min.js'}, opts)),
    optimize.bind(null, _.extend({out: 'dist/vis.js', optimize: 'none'}, opts))
  ], done);
});

gulp.task('legacy', function (done) {
  var opts = {
    dir: 'dist',
    appDir: 'src',
    baseUrl: '.',
    modules: [{name: 'config', include: []}]
  };

  optimize(opts, done);
});

function optimize(opts, cb) {
  rjs.optimize(opts,
    function (text) { cb(null, text) },
    cb
  );
}
