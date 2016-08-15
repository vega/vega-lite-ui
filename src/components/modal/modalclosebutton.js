'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'components/modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        closeAction: '&'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeAction) {
            scope.closeAction();
          }
        };
      }
    };
  });
