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

        var unwatchRange = scope.$watch('filter.range', function(range, oldRange) {
          if (!oldRange || !range || (range === oldRange)) return; // skip first time
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        }, true);

        scope.$on('$destroy', function() {
          // Clean up watcher
          unwatchRange();
        });
      }
    };
  });
