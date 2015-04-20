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
    .pipe(concatCss(minify ? 'viz.min.css' : 'viz.css'))
    .pipe(minify ? minifyCss({keepBreaks:true}) : gutil.noop())
    .pipe(gulp.dest('dist/optimized'))
}

gulp.task('css-combine', css.bind(null, false))
gulp.task('css-optimize', css.bind(null, true))

gulp.task('optimize', ['css-combine', 'css-optimize'], function (done) {
  dir.files('src', function (err, files) {
    if (err) return done(err)

    const excludes = {
      // TODO: exclude only data files
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
        .map(function (file) { return file.substring('src/'.length) })
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
    appDir: 'src',
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
