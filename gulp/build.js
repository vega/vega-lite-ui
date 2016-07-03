'use strict';

var gulp = require('gulp');
var path = require('path');
var paths = gulp.paths;

var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
});

gulp.task('vlschema', function() {
  gulp.src('bower_components/vega-lite/vega-lite-schema.json')
    .pipe($.jsonTransform(function(data, file) {
      return 'window.     vlSchema = ' + JSON.stringify(data, null, 2) + ';';
    }))
    .pipe($.rename('vl-schema.js'))
    .pipe(gulp.dest(paths.tmp + '/schema/'));
});

gulp.task('partials', function () {
  return gulp.src([
      paths.src + '/**/*.html'
    ])
    .pipe($.minifyHtml({
      empty: true,
      spare: true,
      quotes: true
    }))
    .pipe($.angularTemplatecache('templateCacheHtml.js', {
      module: 'vlui'
    }))
    .pipe(gulp.dest(paths.tmp + '/partials/'));
});

// Root directory
var rootDirectory = path.resolve('./');
// Source directory for build process
var sourceDirectory = path.join(rootDirectory, './src');

var sourceFiles = [
  // Start with 3rd-party dependencies
  path.join(sourceDirectory, '/vendor/**/*.js'),
  // schema file
  paths.tmp + '/schema/vl-schema.js',
  // Make sure the module is handled first
  path.join(sourceDirectory, '/index.js'),
  // template cache file
  paths.tmp + '/partials/templateCacheHtml.js',
  // Then add all JavaScript files
  path.join(sourceDirectory, '/**/*.js'),
  // except spec files
  '!'+path.join(sourceDirectory, '/**/*.test.js')
];

gulp.task('build', ['vlschema', 'partials', 'css'], function() {
  gulp.src(sourceFiles)
    // .pipe(filter('-'+path.join(sourceDirectory, '/**/*.test.js')))
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
      .pipe($.ngAnnotate({
        add: true, // Add dependency annotations
        single_quotes: true
      }))
      .pipe($.iife({
        useStrict: false
      }))
    .pipe($.concat('vlui.js'))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.'))
    .pipe($.uglify())
    .pipe($.rename('vlui.min.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('css', function() {
  gulp.src([
      path.join(sourceDirectory, '/index.scss'),
      path.join(sourceDirectory, '/**/*.scss'),
    ])
  .pipe($.wrapper({
    header: '// ====== ${filename} ====== \n'
  }))
  .pipe($.concat('vlui.scss'))
  .pipe(gulp.dest('.'));
});
