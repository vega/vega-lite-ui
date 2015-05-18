'use strict';

var gulp = require('gulp');

var $ = require('gulp-load-plugins')();

var wiredep = require('wiredep');

var paths = gulp.paths;

function runTests (singleRun, done) {
  var bowerDeps = wiredep({
    directory: 'bower_components',
    dependencies: true,
    devDependencies: true
  });

  var testFiles = bowerDeps.js.concat([
    paths.src + '/**/*.js',
    paths.src + '/vendor/*.js',
    paths.src + '/partials/templateCacheHtml.js'
  ]);

  gulp.src(testFiles)
    .pipe($.karma({
      configFile: 'karma.conf.js',
      action: (singleRun)? 'run': 'watch',
      debounceDelay: 1000
    }))
    .on('error', function (err) {
      // jshint unused:false
      // Make sure failed tests cause gulp to exit non-zero
      this.emit('end');
    });

  done();
}

gulp.task('test', ['partials'], function (done) {
  runTests(true /* singleRun */, done);
});

gulp.task('test:auto', ['partials'], function (done) {
  runTests(false /* singleRun */, done);
});
