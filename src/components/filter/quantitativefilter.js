'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('quantitativeFilter', function (Dataset) {
    return {
      templateUrl: 'components/filter/quantitativefilter.html',
      restrict: 'E',
      replace: false,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope, element) {
        var domain = Dataset.domain(scope.field);
        scope.domainMin = domain[0];
        scope.domainMax = domain[1];

        // don't update until range slider handle released
        scope.localMin = scope.filter.range[0];
        scope.localMax = scope.filter.range[1];
        scope.updateRange = function() {
          scope.filter.range[0] = scope.localMin;
          scope.filter.range[1] = scope.localMax;
        };
      }
    };
  });
