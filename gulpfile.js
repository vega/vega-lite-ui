"use strict";
/* globals __dirname */

var gulp = require('gulp');
var bump = require('gulp-bump');
var karma = require('karma').server;
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var path = require('path');
var plumber = require('gulp-plumber');
var runSequence = require('run-sequence');
var jshint = require('gulp-jshint');
var filter = require('gulp-filter');


/**
 * File patterns
 **/

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

gulp.task('build', function() {
  gulp.src(sourceFiles)
    // .pipe(filter('-'+path.join(sourceDirectory, '/**/*.spec.js')))
    .pipe(plumber())
    .pipe(concat('vlui.js'))
    .pipe(gulp.dest('.'))
    .pipe(uglify())
    .pipe(rename('vlui.min.js'))
    .pipe(gulp.dest('.'));
});

/**
 * Process
 */
gulp.task('process-all', function (done) {
  runSequence('jshint', 'test', 'build', done);
});

/**
 * Watch task
 */
gulp.task('watch', function () {

  // Watch JavaScript files
  gulp.watch(sourceFiles, ['process-all']);
});

/**
 * Validate source JavaScript
 */
gulp.task('jshint', function () {
  return gulp.src(sourceFiles)
    .pipe(plumber())
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

/**
 * Run test once and exit
 */
gulp.task('test', function (done) {
  karma.start({
    configFile: __dirname + '/karma-src.conf.js',
    singleRun: true
  }, function() { done(); });
});

/**
 * Run test once and exit
 */
gulp.task('test-dist-concatenated', function (done) {
  karma.start({
    configFile: __dirname + '/karma-dist-concatenated.conf.js',
    singleRun: true
  }, function() { done(); });
});

/**
 * Run test once and exit
 */
gulp.task('test-dist-minified', function (done) {
  karma.start({
    configFile: __dirname + '/karma-dist-minified.conf.js',
    singleRun: true
  }, function() { done(); });
});

gulp.task('default', function () {
  runSequence('process-all', 'watch');
});



function inc(importance) {
    // get all the files to bump version in
    return gulp.src(['./package.json', './bower.json'])
        // bump the version number in those files
        .pipe(bump({type: importance}))
        // save it back to filesystem
        .pipe(gulp.dest('./'));
}

gulp.task('patch', function() { return inc('patch'); });
gulp.task('feature', function() { return inc('minor'); });
gulp.task('release', function() { return inc('major'); });