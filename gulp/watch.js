'use strict';

var gulp = require('gulp');

var paths = gulp.paths;

gulp.task('watch', ['build'], function () {
  gulp.watch([
    paths.src + '/**/*.html',
    paths.src + '/**/*.scss',
    paths.src + '/**/*.js',
    'bower.json'
  ], ['jshint', 'test', 'build']);
});
