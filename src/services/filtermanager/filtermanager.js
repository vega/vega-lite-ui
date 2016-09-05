'use strict';

angular.module('vlui')
  .service('FilterManager', function (_, vl, Dataset, Logger) {
    var self = this;

    /** local object for this object */
    self.filterIndex = {};

    this.toggle = function(field) {
      if (!self.filterIndex[field]) {
        self.filterIndex[field] = initFilter(field);
      } else {
        self.filterIndex[field].enabled = !self.filterIndex[field].enabled;
      }
      Logger.logInteraction(
        self.filterIndex[field].enabled ? Logger.actions.FILTER_ENABLED : Logger.actions.FILTER_DISABLED,
        field,
        self.filterIndex[field]
      );
    };

    this.add = function(field) {
      if (!self.filterIndex[field]) {
        self.filterIndex[field] = initFilter(field);
        Logger.logInteraction(Logger.actions.FILTER_ENABLED, field, self.filterIndex[field]);
        return true;
      }
      return false;
    }

    this.reset = function(oldFilter, hard) {
      if (hard) {
        self.filterIndex = {};
      } else {
        _.forEach(self.filterIndex, function(value, field) {
          if (self.filterIndex[field].enabled) {
            self.filterIndex[field] = initFilter(field);
          }
        });
      }

      if (oldFilter) {
        oldFilter.forEach(function(filter) {
          self.filterIndex[filter.field] = vl.util.extend({enabled: true}, filter);
        });
      }

      return self.filterIndex;
    };

    this.getVlFilter = function() {
      var vlFilter = _.reduce(self.filterIndex, function (filters, filter) {
        var field = filter.field;
        var timeUnit = filter.timeUnit;

        if (filter.in) {
          if ( filter.in.length === 0 ||
               filter.in.length === Dataset.schema.cardinality({field: field}) ) {
            return filters;
          }
        } else if (filter.range) {
          var domain = Dataset.schema.domain({
            field: field,
            timeUnit: timeUnit
          });

          if (filter.range[0] === domain[0] && filter.range[1] === domain[1]) {
            return filters;
          }
        }

        if (filter.enabled) {
          filters.push(_.omit(filter, 'enabled'));
        }
        return filters;
      }, []);

      return vlFilter.length ? vlFilter : undefined;
    };

    function initFilter(field) {
      var type = Dataset.schema.type(field);

      switch (type) {
        case vl.type.NOMINAL:
        case vl.type.ORDINAL:
          return {
            enabled: true,
            field: field,
            in: Dataset.schema.domain({field: field})
          };
        case vl.type.QUANTITATIVE:
          return {
            enabled: true,
            field: field,
            range: [
              Dataset.schema.stats({field: field}).min,
              Dataset.schema.stats({field: field}).max
            ]
          };
        case vl.type.TEMPORAL:
          return {
            enabled: true,
            field: field,
            range: [
              Dataset.schema.stats({field: field}).min,
              Dataset.schema.stats({field: field}).max
            ]
          };
      }
    }
  });
