'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:vlModal
 * @description
 * # vlModal
 */
angular.module('vlui')
  .directive('vlModal', function (VlModals) {
    return {
      templateUrl: 'modal/vlmodal.html',
      restrict: 'E',
      transclude: true,
      scope: true,
      // Provide an interface for child directives to close this modal
      controller: function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      },
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        // Default to closed
        scope.isOpen = false;

        // Register this modal with the service
        VlModals.register(modalId, scope);
        scope.$on('$destroy', function() {
          VlModals.deregister(modalId);
        });
      }
    };
  });
