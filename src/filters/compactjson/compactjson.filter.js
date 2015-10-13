'use strict';

angular.module('vlui')
  .filter('compactJSON', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  });
