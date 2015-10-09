'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', function (Modals) {
    return {
      templateUrl: 'modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      },
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        scope.wrapperStyle = 'max-width:' + scope.maxWidth;

        // Default to closed
        scope.isOpen = false;

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  });
