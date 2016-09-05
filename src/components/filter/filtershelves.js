'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('filterShelves', function (FilterManager, Dataset, Logger, cql, vl, Alerts) {
    return {
      templateUrl: 'components/filter/filtershelves.html',
      restrict: 'E',
      replace: false,
      scope: {
        spec: '='
      },
      link: function(scope) {
        scope.Dataset = Dataset;
        scope.filterManager = FilterManager;
        scope.clearFilter = clearFilter;
        scope.removeFilter = removeFilter;
        scope.filterType = filterType;

        scope.filterInvalidOptions = [
          {value: true, label: 'Filter all invalid values'},
          {value: undefined, label: 'Filter invalid numbers'},
          {value: false, label: 'Show all invalid values'},
        ];

        scope.filterInvalidChanged = function() {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.spec.transform.filterInvalid);
        };

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

        function clearFilter() {
          FilterManager.reset();
          Logger.logInteraction(Logger.actions.FILTER_CLEAR);
        }

        function removeFilter(field) {
          FilterManager.toggle(field);
        }

        scope.fieldDropped = function() {
          if (scope.droppedFieldDef.aggregate === 'count') {
            Alerts.add('Cannot add filter for count field');
          } else if (cql.enumSpec.isEnumSpec(scope.droppedFieldDef.field)) {
            Alerts.add('Cannot add filter for wildcard field');
          } else {
            var added = FilterManager.add(scope.droppedFieldDef.field);
            if (!added) {
              Alerts.add('Already have filter for ' + scope.droppedFieldDef.field + '.');
            }
          }
          scope.droppedFieldDef = {};
        };
      }
    };
  });
