'use strict';

angular.module('vlui')
  .directive('alertMessages', function(Alerts) {
    return {
      templateUrl: 'components/alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  });
