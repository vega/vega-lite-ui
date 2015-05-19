'use strict';
/* globals window, angular */

angular.module('vlui', [
  'LocalStorageModule', 
  'angular-websql'
  ])
  .constant('_', window._)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  .constant('Papa', window.Papa)
  .constant('dl', window.dl)
  .constant('Blob', window.Blob) // Papa
  .constant('URL', window.URL) // Papa
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: false,
    defaultConfigSet: 'large',
    appId: 'polestar'
  });
  // .config(function(uiZeroclipConfigProvider) {
  //   // config ZeroClipboard
  //   uiZeroclipConfigProvider.setZcConf({
  //     swfPath: 'bower_components/zeroclipboard/dist/ZeroClipboard.swf'
  //   });
  // });

'use strict';

angular.module('vlui')
  .service('Alerts', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  });

'use strict';

/**
 * @ngdoc service
 * @name polestar.Bookmarks
 * @description
 * # Bookmarks
 * Service in the polestar.
 */
angular.module('vlui')
  .service('Bookmarks', function(_, vl, localStorageService, Logger) {
    var Bookmarks = function() {
      this.dict = {};
      this.length = 0;
    };

    var proto = Bookmarks.prototype;

    proto.updateLength = function() {
      this.length = Object.keys(this.dict).length;
    };

    proto.save = function() {
      localStorageService.set('bookmarks', this.dict);
    };

    proto.load = function() {
      this.dict = localStorageService.get('bookmarks') || {};
      this.updateLength();
    };

    proto.clear = function() {
      this.dict = {};
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARKS_CLEAR);
    };

    proto.toggle = function(chart) {
      var shorthand = chart.shorthand;

      if (this.dict[shorthand]) {
        this.remove(chart);
      } else {
        this.add(chart);
      }
    };

    proto.add = function(chart) {
      var shorthand = chart.shorthand;

      console.log('adding', chart.vlSpec, shorthand);

      chart.timeAdded = (new Date().getTime());

      this.dict[shorthand] = _.cloneDeep(chart);
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      delete this.dict[shorthand];
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.isBookmarked = function(shorthand) {
      return shorthand in this.dict;
    };

    return new Bookmarks();
  });

'use strict';

var datasets = [{
  name: 'Barley',
  url: 'data/barley.json',
  id: 'barley',

},{
  name: 'Cars',
  url: 'data/cars.json',
  id: 'cars'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin'
},{
  name: 'Budget 2016',
  url: 'data/budget.json',
  id: 'budget'
},{
  name: 'Climate Normals',
  url: 'data/climate.json',
  id: 'climate'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26'
}];

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, field) {
    m[field.name] = field;
    return m;
  }, {});
}

angular.module('vlui')
  .factory('Dataset', function($http, Alerts, _, Papa, dl, vl) {
    var Dataset = {};

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

    // TODO move these to constant to a universal vlui constant file
    Dataset.typeNames = {
      O: 'text',
      Q: 'number',
      T: 'time',
      G: 'geo'
    };

    Dataset.fieldOrder = vl.field.order.typeThenName;
    Dataset.getSchema = function(data, stats, order) {
      var types = dl.read.types(data),
        schema = _.reduce(types, function(s, type, name){
          s.push({name: name, type: vl.data.types[type]});
          return s;
        }, []);

      schema = dl.stablesort(schema, order || vl.field.order.typeThenName, vl.field.order.name);

      schema.push(vl.field.count());

      schema.forEach(function(field) {
        // if fewer than 2% of values or unique, assume the field to be ordinal,
        // or <= 7 unique values
        var profile = stats[field.name];
        if (profile !== undefined && (field.type === 'Q' && profile.distinct <= 20 &&
              (profile.distinct < (profile.count - profile.numNulls)/50 || profile.distinct <= 7))) {
          field.type = 'O';
        }
      });
      return schema;
    };

    Dataset.getStats = function(data) {
      // TODO add sampling back here, but that's less important for now
      var summary = dl.summary(data);

      return summary.reduce(function(s, profile) {
        s[profile.field] = profile;
        return s;
      }, {count: data.length});
    };

    // update the schema and stats
    Dataset.update = function(dataset) {
      return $http.get(dataset.url, {cache: true}).then(function(response) {
        // first see whether the data is JSON, otherwise try to parse CSV
        if (_.isObject(response.data)) {
           Dataset.data = response.data;
           Dataset.type = 'json';
        } else {
           var result = Papa.parse(response.data, {
            dynamicTyping: true,
            header: true
          });

          if (result.errors.length === 0) {
            Dataset.data = result.data;
            Dataset.type = 'csv';
          } else {
            _.each(result.errors, function(err) {
              Alerts.add(err.message, 2000);
            });
            return;
          }
        }

        Dataset.stats = Dataset.getStats(Dataset.data);
        Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
        Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
      });
    };

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);
    };

    return Dataset;
  });

'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', function ($location, $window, $webSql, consts, Papa, Blob, URL) {

    var service = {};

    // get user id once in the beginning
    var user = $location.search().user;

    service.db = $webSql.openDatabase('logs', '1.0', 'Logs', 2 * 1024 * 1024);

    service.tableName = 'log_' + consts.appId;

    service.actions = {
      UNDO: 'UNDO',
      REDO: 'REDO',
      DATASET_CHANGE: 'DATASET_CHANGE',
      CHART_MOUSEOVER: 'CHART_MOUSEOVER',
      CHART_MOUSEOUT: 'CHART_MOUSEOUT',
      CHART_RENDER: 'CHART_RENDER',
      CHART_EXPOSE: 'CHART_EXPOSE',
      CHART_TOOLTIP: 'CHART_TOOLTIP',
      BOOKMARK_ADD: 'BOOKMARK_ADD',
      BOOKMARK_REMOVE: 'BOOKMARK_REMOVE',
      BOOKMARKS_CLEAR: 'BOOKMARKS_CLEAR',

      NULL_FILTER_TOGGLE: 'NULL_FILTER_TOGGLE',
      TRANSPOSE_TOGGLE: 'TRANSPOSE_TOGGLE',
      SORT_TOGGLE: 'SORT_TOGGLE',
      MARKTYPE_TOGGLE: 'MARKTYPE_TOGGLE',
      LOG_TOGGLE: 'LOG_TOGGLE',

      FUNC_CHANGE: 'FUNC_CHANGE',
      // Polestar only
      SPEC_CHANGE: 'SPEC_CHANGE',
      FIELD_DROP: 'FIELD_DROP',
      MARK_CHANGE: 'MARK_CHANGE',
      // Voyager only
      FIELDS_CHANGE: 'FIELDS_CHANGE',
      FIELDS_RESET: 'FIELDS_RESET',
      DRILL_DOWN_OPEN: 'DRILL_DOWN_OPEN',
      DRILL_DOWN_CLOSE: 'DRILL_DOWN_CLOSE',
      CLUSTER_SELECT: 'CLUSTER_SELECT',
      LOAD_MORE: 'LOAD_MORE'
    };

    service.createTableIfNotExists = function() {
      service.db.createTable(service.tableName, {
        'userid':{
          'type': 'INTEGER',
          'null': 'NOT NULL'
        },
        'time':{
          'type': 'TIMESTAMP',
          'null': 'NOT NULL',
          'default': 'CURRENT_TIMESTAMP'
        },
        'action':{
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'data': {
          'type': 'TEXT'
        },
        'diff': {
          'type': 'TEXT'
        }
      });
    };

    service.clear = function() {
      var r = $window.confirm('Really clear the logs?');
      if (r === true) {
        service.db.dropTable(service.tableName);
        service.createTableIfNotExists();
      }
    };

    service.export = function() {
      service.db.selectAll(service.tableName).then(function(results) {
        if (results.rows.length === 0) {
          console.warn('No logs');
          return;
        }

        var rows = [];

        for(var i=0; i < results.rows.length; i++) {
          rows.push(results.rows.item(i));
        }
        var csv = Papa.unparse(rows);

        var csvData = new Blob([csv], { type: 'text/csv' });
        var csvUrl = URL.createObjectURL(csvData);

        var element = angular.element('<a/>');
        element.attr({
          href: csvUrl,
          target: '_blank',
          download: service.tableName + '.csv'
        })[0].click();
      });
    };

    service.logInteraction = function(action, data, diff) {
      if (!consts.logging) {
        return;
      }

      // console.log('[Logging] ', action, data);

      var row = {userid: user, action: action};
      if (data !== undefined) {
        row.data = JSON.stringify(data);
      }

      if (diff !== undefined) {
        row.diff = JSON.stringify(diff);
      }

      service.db.insert(service.tableName, row).then(function(/*results*/) {});
    };

    service.createTableIfNotExists();

    return service;
  });
