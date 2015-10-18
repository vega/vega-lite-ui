'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', function (Bookmarks, consts, vl, Dataset, Logger, _) {
    return {
      templateUrl: 'vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      },
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight: '=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',

        /* vlplotgroup specific */

        fieldSet: '=',

        showBookmark: '@',
        showDebug: '=',
        showExpand: '=',
        showFilterNull: '@',
        showLabel: '@',
        showLog: '@',
        showMarkType: '@',
        showSort: '@',
        showTranspose: '@',

        alwaysSelected: '=',
        isSelected: '=',
        highlighted: '=',
        expandAction: '&',
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.Dataset = Dataset;

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, encType) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            field = encoding[encType];

          return field && field.type ==='Q' && !field.bin;
        };

        scope.log.toggle = function(spec, encType) {
          if (!scope.log.support(spec, encType)) { return; }

          var field = spec.encoding[encType],
            scale = field.scale = field.scale || {};

          scale.type = scale.type === 'log' ? 'linear' : 'log';
          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand);
        };
        scope.log.active = function(spec, encType) {
          if (!scope.log.support(spec, encType)) { return; }

          var field = spec.encoding[encType],
            scale = field.scale = field.scale || {};

          return scale.type === 'log';
        };

        // TOGGLE SORT

        var toggleSort = scope.toggleSort = function(spec) {
          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand);
          vl.Encoding.toggleSort(spec);
        };
        //FIXME
        toggleSort.support = vl.Encoding.toggleSort.support;

        // TOGGLE FILTER

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          spec.config = spec.config || {};
          spec.config.filterNull = spec.config.filterNull || {
            // TODO: initiate this from filterNull's schema instead
            N: false,
            O: false,
            T: true,
            Q: true
          };
          spec.config.filterNull.O = !spec.config.filterNull.O;
          spec.config.filterNull.N = !spec.config.filterNull.N;
        };

        scope.toggleFilterNull.support = function(spec, stats) {
          var fields = vl.enc.fields(spec.encoding);
          for (var fieldName in fields) {
            var fieldList = fields[fieldName];
            if (
                (fieldList.containsType.O || fieldList.containsType.N) &&
                (fieldName in stats) &&
                stats[fieldName].missing > 0
              ) {
              return true;
            }
          }
          return false;
        };

        scope.toggleSortClass = function(vlSpec) {
          var direction = vlSpec && vl.Encoding.toggleSort.direction(vlSpec),
            mode = vlSpec && vl.Encoding.toggleSort.mode(vlSpec);

          if (direction === 'y') {
            return mode === 'Q' ? 'fa-sort-amount-desc' :
              'fa-sort-alpha-asc';
          } else if (direction === 'x') {
            return mode === 'Q' ? 'fa-sort-amount-desc sort-x' :
              'fa-sort-alpha-asc sort-x';
          } else {
            return 'invisible';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand);
          vl.Encoding.transpose(scope.chart.vlSpec);
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  });
