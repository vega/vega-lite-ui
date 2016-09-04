'use strict';

angular.module('vlui')
  .directive('functionSelect', function(_, consts, vl, cql, Pills, Logger, Dataset) {
    return {
      templateUrl: 'components/functionselect/functionselect.html',
      restrict: 'E',
      scope: {
        channelId: '<',
        fieldDef: '=',
        supportAny: '<'
      },
      link: function(scope /*,element, attrs*/) {
        var BIN='bin', COUNT='count', maxbins;

        scope.hideMoreFn = consts.hideMoreFn;

        scope.func = {
          selected: undefined,
          checked: {undefined: true},
          list: {
            aboveFold: [],
            belowFold: [] // could be empty
          },
          isAny: false,
          isTemporal: false, // for making belowFold timeUnits single-column
          isCount: false // hide "more" & "less" toggle for COUNT
        };

        // functions for T = timeUnits + undefined
        var temporalFunctions = {
          aboveFold: [
            undefined, 'yearmonthdate',
            'year', 'month', // hide 'quarter' for user study because it's buggy
            'date','day',
            'hours', 'minutes',
            'seconds', 'milliseconds'
          ],
          belowFold: [
            'yearquarter',
            'yearmonth',
            'yearmonthdatehours',
            'yearmonthdatehoursminutes',
            'yearmonthdatehoursminutesseconds',
            'hoursminutes',
            'hoursminutesseconds',
            'minutesseconds',
            'secondsmilliseconds'
          ]
        };

        var timeUnitHasVariationFilter = function(timeUnit) {

          var pill =  Pills.get(scope.channelId);
          if (!pill) {
            return true;
          }
          var field = pill.field;
          // Convert 'any' channel to '?'.
          var channel = Pills.isAnyChannel(scope.channelId) ? '?' : scope.channelId;

          if (cql.enumSpec.isEnumSpec(field)) {
            // If field is ?, we can't really filter timeUnit
            return true;
          }

          return !timeUnit || // Don't filter undefined
            // Remove timeUnits that do not have variation (cardinality <= 1).
            Dataset.schema.timeUnitHasVariation({field: field, channel: channel, timeUnit: timeUnit});
        };

        // timeUnits = T functions - undefined
        var timeUnits = _.pull(_.concat(temporalFunctions.aboveFold, 'quarter', temporalFunctions.belowFold), undefined);

        // functions for Q = aggregates + BIN + undefined - COUNT
        var quantitativeFunctions = {
          aboveFold: [
            undefined, 'bin',
            'min', 'max',
            'mean', 'median',
            'sum'
          ],
          belowFold: [
            'valid', 'missing',
            'distinct', 'modeskew',
            'q1', 'q3',
            'stdev', 'stdevp',
            'variance', 'variancep'
          ] // hide COUNT for Q in the UI because we dedicate it to a special "# Count" field
        };

        // aggregates = Q Functions + COUNT - BIN - undefined
        var aggregates = _.pull(_.concat(quantitativeFunctions.aboveFold, quantitativeFunctions.belowFold, [COUNT]),
          BIN, undefined);

        function isPillQ(pill) {
          return pill && pill.type && (pill.type === vl.type.QUANTITATIVE || (pill.type.enum && vl.util.contains(pill.type.enum,vl.type.QUANTITATIVE)));
        }

        function isPillT(pill) {
          return pill && pill.type && (pill.type === vl.type.TEMPORAL || (pill.type.enum && vl.util.contains(pill.type.enum,vl.type.TEMPORAL)));
        }

        scope.selectChanged = function() {
          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.selected, {
            channel: scope.channelId
          });

          var selectedFunc = scope.func.selected;

          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            isQ = isPillQ(pill),
            isT = isPillT(pill);

          if(!pill){
            return; // not ready
          }

          // reset field def
          // HACK: we're temporarily storing the maxbins in the pill
          // FIXME temporal can actually have aggregation in practice too
          pill.bin = selectedFunc === BIN ? {} : undefined;
          pill.aggregate = (isQ && aggregates.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;
          pill.timeUnit = (isT && timeUnits.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        scope.isAnyChanged = function () {
          if (scope.func.isAny) {
            var checked = {};
            checked[scope.func.selected] = true;
            scope.func.checked = checked;
            scope.checkChanged();
          } else {
            scope.selectChanged();
          }
        };

        scope.checkChanged = function() {
          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            isQ = isPillQ(pill),
            isT = isPillT(pill);

          if (!pill) {
            return; // not ready
          }

          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.checked, {
            channel: scope.channelId
          });

          // store checked nofn, aggregates, timeUnits but exclude bin as we will check for bin directly
          var fns = Object.keys(scope.func.checked)
            .filter(function(f) { return f !== 'bin' && scope.func.checked[f]; })
            .map(function(f) { return f === 'undefined' ? undefined : f; });

          // FIXME temporal / ordinal / nominal can actually have aggregation in practice too
          if (isQ) {
            pill.bin = scope.func.checked.bin ?
              (fns.length > 0 ? {enum: [false, true]} : true) :
              undefined;
            pill.aggregate = {enum: scope.func.checked.bin ? fns.concat([undefined]) : fns};
            pill.hasFn = scope.func.checked['undefined'] ? undefined : true;

            pill.timeUnit = undefined;
          } else if (isT) {
            pill.aggregate = undefined;
            pill.bin = undefined;
            pill.timeUnit = {enum: fns};
            pill.hasFn = undefined;
          }

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        // when parent objects modify the field
        var fieldDefWatcher = scope.$watch('fieldDef', function(pill) {
          if (!pill) {
            return;
          }

          // hack: save the maxbins
          if (pill.bin) {
            maxbins = pill.bin.maxbins;
          }

          var isOrdinalShelf = ['row','column','shape'].indexOf(scope.channelId) !== -1,
              isQ = isPillQ(pill),
              isT = isPillT(pill);

          // for making belowFold timeUnits single-column
          scope.func.isTemporal = isT;

          // hide "more" & "less" toggles for COUNT
          scope.func.isCount = pill.field === '*';

          if(pill.field === '*' && pill.aggregate === COUNT){
            scope.func.list.aboveFold=[COUNT];
            scope.func.list.belowFold=[];
            scope.func.selected = COUNT;
          } else {
            // TODO: check supported type based on primitive data?
            if (isT) {
              scope.func.list.aboveFold = temporalFunctions.aboveFold.filter(timeUnitHasVariationFilter);
              scope.func.list.belowFold = temporalFunctions.belowFold.filter(timeUnitHasVariationFilter);
            }
            else if (isQ) {
              scope.func.list.aboveFold = quantitativeFunctions.aboveFold;
              scope.func.list.belowFold = quantitativeFunctions.belowFold;
            }

            var defaultVal = (isOrdinalShelf &&
              (isQ && BIN) || (isT && consts.defaultTimeFn)
            ) || undefined;

            scope.func.isAny = cql.enumSpec.isEnumSpec(pill.aggregate) ||
              cql.enumSpec.isEnumSpec(pill.bin) ||
              cql.enumSpec.isEnumSpec(pill.timeUnit);

            if (scope.func.isAny) {
              var checked = {};
              if (isQ) {
                var disallowUndefined = false;
                if (pill.bin) {
                  checked.bin = true;
                  if (cql.enumSpec.isEnumSpec(pill.bin)) {
                    if (pill.bin.enum) {
                      pill.bin.enum.forEach(function(bin) {
                        if (!bin) {
                          disallowUndefined = true;
                        }
                      });
                    }
                  } else {
                    disallowUndefined = true;
                  }
                }
                if (pill.aggregate) {
                  if (cql.enumSpec.isEnumSpec(pill.aggregate)) {
                    var aggregates = pill.aggregate.enum || cql.config.DEFAULT_QUERY_CONFIG.aggregates;
                    aggregates.forEach(function(aggregate) {
                      checked[aggregate] = true;
                    });
                    if (!checked['undefined']) {
                      disallowUndefined = true;
                    }
                  } else {
                    checked[pill.aggregate] = true;
                  }
                }

                if (disallowUndefined) {
                  delete checked['undefined'];
                } else {
                  checked['undefined'] = true;
                }
              } else if (isT) {
                if (pill.timeUnit) {
                  if (cql.enumSpec.isEnumSpec(pill.timeUnit)) {
                    var timeUnits = pill.timeUnit.enum || cql.config.DEFAULT_QUERY_CONFIG.aggregates;
                    timeUnits.forEach(function(timeUnit) {
                      checked[timeUnit] = true;
                    });
                  } else {
                    // Non-enum spec
                    checked[pill.timeUnit] = true;
                  }
                } else {
                  checked['undefined'] = true;
                }
              }
              scope.func.checked = checked;
            } else {
              var selected = pill.bin ? 'bin' :
                pill.aggregate || pill.timeUnit;

              if (scope.func.list.aboveFold.indexOf(selected) >= 0 || scope.func.list.belowFold.indexOf(selected) >= 0) {
                scope.func.selected = selected;
              } else {
                scope.func.selected = defaultVal;
              }
            }
          }
        }, true);

        scope.$on('$destroy', function() {
          // Clean up watcher(s)
          fieldDefWatcher();
        });
      }
    };
  });
