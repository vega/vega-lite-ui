'use strict';

var gulp = require('gulp');

gulp.paths = {
  src: 'src',
  tmp: '.tmp'
};

require('require-dir')('./gulp');

gulp.task('default', ['jshint', 'test', 'build', 'watch']);
