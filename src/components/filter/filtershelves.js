'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('filterShelves', function (FilterManager, Dataset, vl) {
    return {
      templateUrl: 'components/filter/filtershelves.html',
      restrict: 'E',
      replace: false,
      scope: {
      },
      link: function(scope, element) {
        scope.Dataset = Dataset;
        scope.filterManager = FilterManager;
        scope.clearFilter = clearFilter;
        scope.removeFilter = removeFilter;
        scope.filterType = filterType;

        function filterType(field) {
          switch (Dataset.schema.type(field)) {
            case 'nominal':
            case 'ordinal':
              return 'categorical';
            case 'quantitative':
              return 'quantitative';
            case 'temporal':
              return vl.timeUnit.defaultScaleType(field) === 'ordinal' ? 'categorical' : 'quantitative';
          }
        };

        function clearFilter(field) {
          FilterManager.reset();
        }

        function removeFilter(field) {
          FilterManager.toggle(field);
        }
      }
    };
  });
