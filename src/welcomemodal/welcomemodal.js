'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('welcomeModal', function (Modals, localStorageService) {
    return {
      templateUrl: 'welcomemodal/welcomemodal.html',
      restrict: 'E',
      transclude: true,
      scope: true,
      link: function(scope/*, element, attrs*/) {
        // Determine whether the modal has been shown before
        var modalHasBeenShown = localStorageService.get('welcomeModalShown');
        if ( ! modalHasBeenShown ) {
          scope.showWelcomeModal = true;
          localStorageService.set('welcomeModalShown', true);
        }
      }
    };
  });
