'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', function (Bookmarks, consts) {
    return {
      templateUrl: 'bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      require: '^vlModal',
      scope: {
        highlighted: '='
      },
      link: function postLink(scope, element, attrs, modalController) {
        scope.deactivate = function() {
          modalController.close();
        }
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  });
