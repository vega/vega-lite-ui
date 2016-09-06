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

        // don't update until range slider handle released
        scope.localMin = scope.filter.range[0];
        scope.localMax = scope.filter.range[1];
        scope.type = Dataset.schema.type(scope.field);
        scope.updateRange = function() {
          scope.filter.range[0] = scope.localMin;
          scope.filter.range[1] = scope.localMax;
          if (scope.type === 'temporal') {
            scope.localMinText = new Date(scope.localMin).toDateString();
            scope.localMaxText = new Date(scope.localMax).toDateString();
          } else {
            scope.localMinText = scope.localMaxText = null;
          }

          scope.$apply(); // Force watcher to observe change
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        };

        if (scope.type === 'temporal') {
          // convert dates to numerical types
          var min = new Date(domain[0]);
          var max = new Date(domain[1]);
          scope.domainMin = min.getTime();
          scope.domainMax = max.getTime();
          scope.domainMinText = min.toDateString();
          scope.domainMaxText = max.toDateString();
        } else {
          scope.domainMin = domain[0];
          scope.domainMax = domain[1];
          scope.domainMinText = null;
          scope.domainMaxText = null;
        }
      }
    };
  });

// for formatting dates according to the selected timeUnit (just for display purposes)
// angular.module('vlui')
//   .filter('timeUnitFilter', function() {
//     return function(dateNumber) {
//       var timeUnit = 'year'; // testing purposes
//       var date = new Date(dateNumber);
//       switch (timeUnit) {
//         case 'year':
//           return date.getFullYear();
//         case 'date':
//           return date.getDate();
//       }
//       return new Date(dateNumber);
//     };
//   });
