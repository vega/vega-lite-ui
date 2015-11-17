'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', function (Dataset, Drop, vl, consts, _) {
    return {
      templateUrl: 'fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        field: '=',
        showType: '=',
        showInfo: '=',
        showCaret: '=',
        popupContent: '=',
        showRemove: '=',
        removeAction: '&',
        action: '&',
        disableCountCaret: '='
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.Type = vl.Type;
        scope.typeNames = consts.typeNames;
        scope.stats = Dataset.stats[scope.field.name];
        scope.containsType = function(types, type) {
          return _.contains(types, type);
        };

        switch(scope.field.type){
          case vl.Type.Ordinal:
            scope.icon = 'fa-font';
            break;
          case vl.Type.Nominal:
            scope.icon = 'fa-font';
            break;
          case vl.Type.Quantitative:
            scope.icon = 'icon-hash';
            break;
          case vl.Type.Temporal:
            scope.icon = 'fa-calendar';
            break;
        }

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(field) {
          return field.aggregate || field.timeUnit ||
            (field.bin && 'bin') ||
            field._aggregate || field._timeUnit ||
            (field._bin && 'bin') || (field._any && 'auto');
        };

        scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        scope.$on('$destroy', function() {
          if (funcsPopup) {
            funcsPopup.destroy();
          }
        });
      }
    };
  });
