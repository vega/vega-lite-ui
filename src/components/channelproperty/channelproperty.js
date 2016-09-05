'use strict';

angular.module('vlui')
  .directive('channelProperty', function(consts, Pills, Logger) {
    return {
      templateUrl: 'components/channelproperty/channelproperty.html',
      restrict: 'E',
      scope: {
        channelId: '<',
        fieldDef: '=',

        /** Whether the channel property cause side effect to the shelf  */
        toggleShelf: '<',
      },
      link: function(scope /*,element, attrs*/) {
        scope.consts = consts;
        scope.useRawDomain = false;

        // FIXME have option to hide log for in applicable mark

        scope.typeChanged = function() {
          Logger.logInteraction(Logger.actions.LOG_TOGGLE, (scope.fieldDef.scale || {}).type);
          if (scope.toggleShelf) {
            Pills.set(scope.channelId, scope.fieldDef, true);
          }
        };

        scope.useRawDomainChange = function(useRawDomain) {
          var scale = scope.fieldDef.scale || {};
          scale.useRawDomain = useRawDomain;
          scope.fieldDef.scale = scale;

          Logger.logInteraction(Logger.actions.USE_RAW_DOMAIN_TOGGLE, useRawDomain);

          if (scope.toggleShelf) {
            Pills.set(scope.channelId, scope.fieldDef, true);
          }
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
