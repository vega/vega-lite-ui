'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('categoricalFilter', function (Dataset, util, FilterManager) {
    return {
      templateUrl: 'components/filter/categoricalfilter.html',
      restrict: 'E',
      replace: true,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope, element) {
        scope.values = [];
        scope.include = {};

        scope.selectAll = selectAll;
        scope.selectNone = selectNone;

        function selectAll() {
          setInclude(scope.values);
        }

        function selectNone() {
          setInclude([]);
        }

        function setInclude(list) {
          scope.include = _.reduce(list, function(include, x) {
            include[x] = true;
            return include;
          }, {});
        }

        scope.$watch('field', function(field) {
          scope.values = Dataset.schema.domain({field: field});
        });

        scope.$watch('filter', function(filter) {
          setInclude(filter.in);
        });

        scope.$watch('include', function(include) {
          scope.filter.in = util.keys(include).filter(function(val) {
            return include[val];
          }).map(function(x) {
            if (+x === +x) { return +x; }
            return x;
          }).sort();
        }, true);
      }
    };
  });
