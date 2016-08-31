'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('filterShelves', function (FilterManager, Dataset, Logger) {
    return {
      templateUrl: 'components/filter/filtershelves.html',
      restrict: 'E',
      replace: false,
      scope: {
      },
      link: function(scope) {
        scope.Dataset = Dataset;
        scope.filterManager = FilterManager;
        scope.clearFilter = clearFilter;
        scope.removeFilter = removeFilter;

        function clearFilter() {
          FilterManager.reset();
          Logger.logInteraction(Logger.actions.FILTER_CLEAR);
        }

        function removeFilter(field) {
          FilterManager.toggle(field);
        }
      }
    };
  });
