'use strict';

angular.module('vlui')
  .directive('shelves', function() {

    return {
      templateUrl: 'components/shelves/shelves.html',
      restrict: 'E',
      scope: {
        spec: '=',
        supportAny: '='
      },
      replace: true,
      controller: function($scope, ANY, vl, Config, Dataset, Logger, Pills) {
        $scope.ANY = ANY;

        $scope.marks = ['point', 'tick', 'bar', 'line', 'area', 'text'];
        $scope.marksWithAny = [ANY].concat($scope.marks);

        $scope.markChange = function() {
          Logger.logInteraction(Logger.actions.MARK_CHANGE, $scope.spec.mark);
        };

        $scope.transpose = function(){
          vl.spec.transpose($scope.spec);
        };

        $scope.clear = function(){
          Pills.reset();
        };

        $scope.$watch('spec', function(spec) {
          Logger.logInteraction(Logger.actions.SPEC_CHANGE, spec);

          Pills.update(spec);
        }, true); //, true /* watch equality rather than reference */);
      }
    };
  });
