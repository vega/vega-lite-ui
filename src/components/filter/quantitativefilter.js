'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('quantitativeFilter', function (Dataset, Logger) {
    return {
      templateUrl: 'components/filter/quantitativefilter.html',
      restrict: 'E',
      replace: false,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope) {
        var domain = Dataset.schema.domain({field: scope.field});
        scope.domainMin = domain[0];
        scope.domainMax = domain[1];

        // don't update until range slider handle released
        scope.localMin = scope.filter.range[0];
        scope.localMax = scope.filter.range[1];
        scope.updateRange = function() {
          scope.filter.range[0] = scope.localMin;
          scope.filter.range[1] = scope.localMax;
          scope.$apply();
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        };
      }
    };
  });
