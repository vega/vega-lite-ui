'use strict';

angular.module('vlui')
  .filter('scaleType', function() {
    return function(input) {
      var scaleTypes = {
        Q: 'Quantitative',
        O: 'Ordinal',
        T: 'Time'
      };

      return scaleTypes[input];
    };
  });
