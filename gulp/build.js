'use strict';

var gulp = require('gulp');
var path = require('path');
var paths = gulp.paths;

var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
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
  // Make sure the module is handled first
  path.join(sourceDirectory, '/index.js'),
  // template cache file
  paths.tmp + '/partials/templateCacheHtml.js',
  // Then add all JavaScript files
  path.join(sourceDirectory, '/**/*.js'),
  // except spec files
  '!'+path.join(sourceDirectory, '/**/*.spec.js')
];

gulp.task('build', ['partials', 'css'], function() {
  gulp.src(sourceFiles)
    // .pipe(filter('-'+path.join(sourceDirectory, '/**/*.spec.js')))
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
