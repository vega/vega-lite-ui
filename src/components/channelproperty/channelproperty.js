'use strict';

angular.module('vlui')
  .directive('channelProperty', function(consts) {
    return {
      templateUrl: 'components/channelproperty/channelproperty.html',
      restrict: 'E',
      scope: {
        channelId: '<',
        fieldDef: '='
      },
      link: function(scope /*,element, attrs*/) {
        scope.consts = consts;
        scope.useRawDomain = false;

        scope.useRawDomainChange = function(useRawDomain) {
          var scale = scope.fieldDef.scale || {};
          scale.useRawDomain = useRawDomain;
          scope.fieldDef.scale = scale;
        };

        var unwatchFieldDef = scope.$watch('fieldDef', function(fieldDef) {
          scope.useRawDomain = (fieldDef.scale || {}).useRawDomain !== false;
        });

        scope.$on('$destroy', function() {
          // Clean up watcher(s)
          unwatchFieldDef();
        });
      }
    };
  });
