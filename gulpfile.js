'use strict';

var gulp = require('gulp');

gulp.paths = {
  src: 'src',
};

require('require-dir')('./gulp');

gulp.task('default', ['jshint', 'test', 'build', 'watch']);
