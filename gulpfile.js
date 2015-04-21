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

// Consts
const appPaths = {
  src: 'src',
  dist: 'dist'
}

const modules = {
  common: ['d3/d3', 'colorbrewer/colorbrewer', 'font-awesome', 'require'],

  other: ['common'],
  tree: ['common'],

  chart: ['other'],
  graph: ['dagre/dagre', 'other'],

  c3: ['c3/c3', 'chart'],
  google: ['chart' /* Google Visualization */],
  map: ['graph', 'topojson/topojson' /* , Google Map */],
  
  layout: ['c3'],
  marshaller: ['chart', 'graph', 'layout']
}

// Helpers
function getModuleDeps(module) {
  if (!modules[module]) return []

  return modules[module]
    .reduce(function (deps, dep) { 
      return deps.concat(dep).concat(getModuleDeps(dep)) 
    }, [])
    .filter(function (dep, index, col) { 
      return col.indexOf(dep) === index 
    })
}

function buildModule(module, cb) {
  gutil.log('Building ' + module + '...')

  dir.files(appPaths.src, function (err, files) {
    if (err) return done(err)
    
    const deps = getModuleDeps(module).reduce(function (dict, dep) { 
      return (dict[dep] = 'empty:') && dict 
    }, {})

    const plugins = {
      'async': '../rjs.noop',
      'css': '../rjs.noop',
      'goog': '../rjs.noop',
      'propertyParser': '../rjs.noop',
    }

    const opts = {
      baseUrl: appPaths.src,
      paths: _.extend({}, plugins, deps),
      include: files
        .map(function (file) { 
          return file.substring((appPaths.src + '/').length) 
        })
        .filter(function (file) { 
          return path.extname(file) === '.js' && 
                 file.indexOf(module) === 0 
        })
    }

    async.parallel([
      optimize.bind(null, _.extend({out: (appPaths.dist + '/optimized/viz.' + module + '.min.js')}, opts)),
      optimize.bind(null, _.extend({out: (appPaths.dist + '/optimized/viz.' + module + '.js'), optimize: 'none'}, opts))
    ], cb)
  }) 
}

function css(minify) {
  return gulp.src(appPaths.src + '/**/*.css')
    .pipe(sort())
    .pipe(concatCss(minify ? 'viz.min.css' : 'viz.css'))
    .pipe(minify ? minifyCss({keepBreaks:true}) : gutil.noop())
    .pipe(gulp.dest(appPaths.dist + '/optimized'))
}

function optimize(opts, cb) {
  rjs.optimize(opts,
    function (text) { cb(null, text) },
    cb
  )
}


// Tasks
gulp.task('build-css', css.bind(null, false))

gulp.task('optimize-css', css.bind(null, true))

gulp.task('build-all', ['build-css', 'optimize-css'], function (cb) {
  async.each(Object.keys(modules), buildModule, cb) 
})

gulp.task('default', ['build-all'], function (done) {
  var opts = {
    dir: appPaths.dist + '/build/viz',
    appDir: appPaths.src,
    baseUrl: '.'
  }
  optimize(opts, done)
})
