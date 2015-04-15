const gulp = require('gulp')
const gutil = require('gulp-util')
const path = require('path')
const _ = require('lodash')
const async = require('async')
const rjs = require('requirejs')
const minifyCss = require('gulp-minify-css')
const concatCss = require('gulp-concat-css')
const sort = require('gulp-natural-sort')
const dir = require('node-dir')

function css(minify) {
  return gulp.src('src/**/*.css')
    .pipe(sort())
    .pipe(concatCss(minify ? 'vis.min.css' : 'vis.css'))
    .pipe(minify ? minifyCss({keepBreaks:true}) : gutil.noop())
    .pipe(gulp.dest('dist'))
}

gulp.task('css-combine', css.bind(null, false))
gulp.task('css-optimize', css.bind(null, true))

gulp.task('default', ['css-combine', 'css-optimize'], function (done) {
  dir.files('src', function (err, files) {
    if (err) return done(err)

    const excludes = {
      'src/config.js': true,
      'src/map/ChoroplethCountries.js': true,
      'src/map/countries.js': true,
      'src/map/ChoroplethCounties.js': true,
      'src/map/us-counties.js': true,
      'src/map/ChoroplethStates.js': true,
      'src/map/us-states.js': true
    }

    const opts = {
      baseUrl: 'src',
      paths: {
        // plugins
        'async': '../rjs/plugins/async',
        'css': '../rjs/plugins/css-ignore',
        'goog': '../rjs/plugins/goog',
        'propertyParser': '../rjs/plugins/propertyParser',

        // vendors
        'd3/d3': 'empty:',
        'c3/c3': 'empty:',
        'lib/colorbrewer': 'empty:',
        'lib/dagre/dagre': 'empty:',
        'lib/font-awesome': 'empty:',
        'lodash/lodash': 'empty:',
        'topojson/topojson': 'empty:'
      },
      stubModules: [
        'async',
        'css',
        'goog',
        'propertyParser'
      ],
      include: files
        .filter(function (file) { return path.extname(file) === '.js' && !excludes[file] })
        .map(function (file) { return file.substring('src/'.length) })
    }

    async.parallel([
      optimize.bind(null, _.extend({out: 'dist/vis.min.js'}, opts)),
      optimize.bind(null, _.extend({out: 'dist/vis.js', optimize: 'none'}, opts))
    ], done)
  })
})

gulp.task('legacy', function (done) {
  var opts = {
    dir: 'build',
    appDir: 'src',
    baseUrl: '.',
    modules: [{name: 'config', include: []}]
  }

  optimize(opts, done)
})

function optimize(opts, cb) {
  rjs.optimize(opts,
    function (text) { cb(null, text) },
    cb
  )
}
