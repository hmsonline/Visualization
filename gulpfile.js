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
  return gulp.src('viz/**/*.css')
    .pipe(sort())
    .pipe(concatCss(minify ? 'viz.min.css' : 'viz.css'))
    .pipe(minify ? minifyCss({keepBreaks:true}) : gutil.noop())
    .pipe(gulp.dest('dist/optimized'))
}

gulp.task('css-combine', css.bind(null, false))
gulp.task('css-optimize', css.bind(null, true))

gulp.task('optimize', ['css-combine', 'css-optimize'], function (done) {
  dir.files('viz', function (err, files) {
    if (err) return done(err)

    const excludes = {
      // TODO: exclude only data files
      'viz/map/ChoroplethCountries.js': true,
      'viz/map/countries.js': true,
      'viz/map/ChoroplethCounties.js': true,
      'viz/map/us-counties.js': true,
      'viz/map/ChoroplethStates.js': true,
      'viz/map/us-states.js': true
    }

    const opts = {
      baseUrl: 'viz',
      paths: {
        // plugins
        'async': '../rjs.noop',
        'css': '../rjs.noop',
        'goog': '../rjs.noop',
        'propertyParser': '../rjs.noop',

        // vendors
        'd3/d3': 'empty:',
        'c3/c3': 'empty:',
        'dagre/dagre': 'empty:',
        'colorbrewer/colorbrewer': 'empty:',
        'font-awesome': 'empty:',
        'topojson/topojson': 'empty:'
      },
      include: files
        .filter(function (file) { return path.extname(file) === '.js' && !excludes[file] })
        .map(function (file) { return file.substring('viz/'.length) })
    }

    async.parallel([
      optimize.bind(null, _.extend({out: 'dist/optimized/viz.min.js'}, opts)),
      optimize.bind(null, _.extend({out: 'dist/optimized/viz.js', optimize: 'none'}, opts))
    ], done)
  })
})

gulp.task('default', ['optimize'], function (done) {
  var opts = {
    dir: 'dist/build/viz',
    appDir: 'viz',
    baseUrl: '.'
  }
  optimize(opts, done)
})

function optimize(opts, cb) {
  rjs.optimize(opts,
    function (text) { cb(null, text) },
    cb
  )
}
