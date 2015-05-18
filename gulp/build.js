'use strict';

var gulp = require('gulp');
var path = require('path');
var paths = gulp.paths;

var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
});

/* File patterns */

// Root directory
var rootDirectory = path.resolve('./');

// Source directory for build process
var sourceDirectory = path.join(rootDirectory, './src');

var sourceFiles = [
  // Make sure the module is handled first
  path.join(sourceDirectory, '/index.js'),

  // Then add all JavaScript files
  path.join(sourceDirectory, '/**/*.js'),
  // except spec files
  '!'+path.join(sourceDirectory, '/**/*.spec.js')
];



gulp.task('partials', function () {
  return gulp.src([
	    paths.src + '/**/*.html'
	  ]);
	  // .pipe($.minifyHtml({
	  //   empty: true,
	  //   spare: true,
	  //   quotes: true
	  // }))
	  // .pipe($.angularTemplatecache('templateCacheHtml.js', {
	  //   module: 'voyager'
	  // }))
	  // .pipe(gulp.dest(paths.tmp + '/partials/'));
});

gulp.task('build', ['partials'], function() {
  gulp.src(sourceFiles)
    // .pipe(filter('-'+path.join(sourceDirectory, '/**/*.spec.js')))
    .pipe($.plumber())
    .pipe($.concat('vlui.js'))
    .pipe(gulp.dest('.'))
    .pipe($.uglify())
    .pipe($.rename('vlui.min.js'))
    .pipe(gulp.dest('.'));
});