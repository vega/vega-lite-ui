;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
  'LocalStorageModule',
  'ui.select',
  'angular-google-analytics'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('dl', window.dl)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  // other libraries
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    typeNames: {
      N: 'text',
      O: 'text-ordinal',
      Q: 'number',
      T: 'time',
      G: 'geo'
    }
  })
  .config(['AnalyticsProvider', function (AnalyticsProvider) {
    AnalyticsProvider
      .setAccount({ tracker: 'UA-44428446-4', name: 'voyager', trackEvent: true });
  }]);
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("bookmarklist/bookmarklist.html","<div class=\"vflex full-width full-height\" id=\"evs\"><div class=\"modal-header no-shrink card no-top-margin no-right-margin\"><modal-close-button on-close=\"logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.length }})</h2><a ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.length > 0\" class=\"vis-list hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in Bookmarks.dict | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group\" chart=\"chart\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" ng-mouseover=\"(highlighted||{})[field.name] = true\" ng-mouseout=\"(highlighted||{})[field.name] = false\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\"></vl-plot-group></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.length === 0\">You have no bookmarks</div></div></div>");
$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <code>{{myriaRestUrl}}</code>.</p><form ng-submit=\"addDataset(myriaDataset)\"><ui-select ng-model=\"$parent.myriaDataset\" style=\"width: 300px\" theme=\"selectize\" ng-disabled=\"disabled\" reset-search-input=\"false\"><ui-select-match placeholder=\"Select dataset...\">{{$select.selected.relationName}}</ui-select-match><ui-select-choices id=\"dataset-name\" repeat=\"dataset in myriaDatasets\" refresh=\"loadDatasets($select.search)\" refresh-delay=\"100\">{{ dataset.userName}}:{{dataset.programName}}:{{dataset.relationName }}</ui-select-choices></ui-select><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it to Voyager. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><tabset><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></modal>");
$templateCache.put("dataset/datasetselector.html","<div><div class=\"open-dataset-popup\"></div><select id=\"dataset-select\" ng-model=\"Dataset.dataset\" ng-change=\"datasetChanged()\" ng-options=\"dataset.name group by dataset.group for dataset in Dataset.datasets track by dataset.id\"><option value=\"\">Add dataset...</option></select></div>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"3\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCountCaret || field.aggregate!==\'count\'}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeNames[field.type]}}\"></span></span> <span ng-if=\"field.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(field)\" class=\"field-func\" ng-class=\"{any: field._any}\">{{ func(field) === \'avg\' ? \'mean\' : func(field) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(field), any: field._any}\">{{ field.name | underscore2space }}</span></span> <span ng-if=\"field.aggregate===\'count\'\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink info\" ng-show=\"showInfo\"><i ng-if=\"field.aggregate !== \'count\' && isTypes(field, [\'N\', \'O\'])\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min}}<br> <strong>Max:</strong> {{stats.max}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"field.aggregate !== \'count\' && field.type === \'T\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | date: short}}<br> <strong>Max:</strong> {{stats.max | date: short}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"field.aggregate !== \'count\' && field.type === \'Q\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | number}}<br> <strong>Max:</strong> {{stats.max | number}}<br> <strong>Stdev:</strong> {{stats.stdev | number:2}}<br> <strong>Mean:</strong> {{stats.mean | number:2}}<br> <strong>Median:</strong> {{stats.median | number}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i><i ng-if=\"field.aggregate === \'count\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Count:</strong> {{stats.max}} </div>\" tooltip-side=\"right\"></i></span></span></span>");
$templateCache.put("modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("tabs/tabset.html","<div class=\"tab-container\"><div><a href=\"\" class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group card vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header full-width no-shrink\"><div class=\"field-set-info\"><field-info ng-repeat=\"field in fieldSet\" ng-if=\"fieldSet\" field=\"field\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(field.name)), unselected: isSelected && !isSelected(field.name), highlighted: (highlighted||{})[field.name] }\" ng-mouseover=\"(highlighted||{})[field.name] = true\" ng-mouseout=\"(highlighted||{})[field.name] = false\"></field-info></div><div class=\"toolbox\"><a ng-show=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\"></i></a><div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vls</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"shCopied=\'(Copied)\'\" zeroclip-model=\"chart.shorthand\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'VL shorthand\', chart.shorthand); shCopied=\'(Logged)\';\">Log</a> <span>{{shCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', encoding: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div><a ng-if=\"showMarkType\" class=\"command disabled\"><i class=\"fa fa-font\"></i> <i class=\"fa fa-line-chart\"></i> <i class=\"fa fa-area-chart\"></i> <i class=\"fa fa-bar-chart\"></i> <i class=\"fa fa-circle-o\"></i></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>LOG X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>LOG Y</small></a> <a ng-show=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleSort(chart.vlSpec)\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" ng-class=\"{active: chart.vlSpec && chart.vlSpec.cfg.filterNull.O}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Transpose</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" ng-click=\"Bookmarks.toggle(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a></div></div><div class=\"vl-plot-wrapper full-width vis-{{fieldSet.key}} flex-grow-1\"><vl-plot chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" max-height=\"maxHeight\" max-width=\"maxWidth\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot></div></div>");
$templateCache.put("vlplot/vlplot.html","<div class=\"vis\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && (maxHeight && (!height || height <= maxHeight)) && (maxWidth && (!width || width <= maxWidth)), overflow: alwaysScrollable || overflow || (maxHeight && height && height > maxHeight) || (maxWidth && width && width > maxWidth), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseover=\"mouseover()\" ng-mouseout=\"mouseout()\"><div class=\"vis-tooltip\" ng-show=\"tooltipActive\"><table><tr ng-repeat=\"p in data\"><td class=\"key\">{{p[0]}}</td><td class=\"value\"><b>{{p[1]}}</b></td></tr></table></div></div>");}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
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
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', 'Logger', function (Bookmarks, consts, Logger) {
    return {
      templateUrl: 'bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        // The bookmark list is designed to render within a modal overlay.
        // Because modal contents are hidden via ng-if, if this link function is
        // executing it is because the directive is being shown. Log the event:
        Logger.logInteraction(Logger.actions.BOOKMARK_OPEN);
        scope.logBookmarksClosed = function() {
          Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
        };

        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.dict = {};
      this.length = 0;
      this.isSupported = localStorageService.isSupported;
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

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
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

      chart.stats = Dataset.stats;

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
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', ['vl', '_', function(vl, _) {
    var Config = {};

    Config.schema = vl.schema.schema.properties.config;
    Config.dataschema = vl.schema.schema.properties.data;

    Config.data = vl.schema.util.instantiate(Config.dataschema);
    Config.config = vl.schema.util.instantiate(Config.schema);

    Config.getConfig = function() {
      return _.cloneDeep(Config.config);
    };

    Config.getData = function() {
      return _.cloneDeep(Config.data);
    };

    Config.large = function() {
      return {
        singleWidth: 400,
        singleHeight: 400,
        largeBandMaxCardinality: 20
      };
    };

    Config.small = function() {
      return {};
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, field) {
    m[field.name] = field;
    return m;
  }, {});
}

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'dl', 'vl', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, dl, vl, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      N: 0,
      O: 0,
      G: 2,
      T: 3,
      Q: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(field) {
      if (field.aggregate==='count') return 4;
      return typeOrder[field.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(field) {
      return Dataset.fieldOrderBy.type(field) + '_' +
        (field.aggregate === 'count' ? '~' : field.name.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.name = function(field) {
      return field.name;
    };

    Dataset.fieldOrderBy.cardinality = function(field, stats) {
      return stats[field.name].distinct;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    Dataset.getSchema = function(data, stats, order) {
      var types = dl.type.inferAll(data),
        schema = _.reduce(types, function(s, type, name) {
          var field = {
            name: name,
            type: vl.data.types[type],
            primitiveType: type
          };

          if (field.type === 'Q' && stats[field.name].distinct <= 5) {
            field.type = 'O';
          }

          s.push(field);
          return s;
        }, []);

      schema = dl.stablesort(schema, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.name);

      schema.push(vl.field.count());
      return schema;
    };

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          Dataset.updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = dl.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          Dataset.updateFromData(dataset, data);
        });
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    Dataset.updateFromData = function(dataset, data) {
      Dataset.data = data;

      Dataset.currentDataset = dataset;
      Dataset.stats = vl.data.stats(Dataset.data);

      for (var fieldName in Dataset.stats) {
        if (fieldName !== '*') {
          Dataset.stats[fieldName].sample = _.sample(_.pluck(Dataset.data, fieldName), 7);
        }
      }

      Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
      Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
    };

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Dataset', 'Modals', 'Logger', function(Dataset, Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.Dataset = Dataset;

        scope.datasetChanged = function() {
          if (!Dataset.dataset) {
            // reset if no dataset has been set
            Dataset.dataset = Dataset.currentDataset;
            Logger.logInteraction(Logger.actions.DATASET_OPEN);
            Modals.open('dataset-modal');
            return;
          }

          Dataset.update(Dataset.dataset);
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string
      if (!maxSize || size / 1024 / 1024 < +maxSize) {
        // max file size was not specified, is empty, or is sufficiently large
        return true;
      }

      Alerts.add('File must be smaller than ' + maxSize + ' MB');
      return false;
    }

    function isTypeValid(type, validMimeTypes) {
      if (!validMimeTypes || validMimeTypes.indexOf(type) > -1) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
        return true;
      }
      Alerts.add('Invalid file type. File must be one of following types: ' + validMimeTypes);
      return false;
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Alerts', 'Logger', 'Config', '_', 'dl', function (Dataset, Alerts, Logger, Config, _, dl) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = dl.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Budget 2016',
  url: 'data/budget.json',
  id: 'budget',
  group: 'sample'
},{
  name: 'Climate Normals',
  url: 'data/climate.json',
  id: 'climate',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['Dataset', 'Drop', 'vl', 'consts', function (Dataset, Drop, vl, consts) {
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

        scope.typeNames = consts.typeNames;
        scope.stats = Dataset.stats[scope.field.name];
        scope.isTypes = vl.field.isTypes;

        switch(scope.field.type){
          case 'O':
            scope.icon = 'fa-font';
            break;
          case 'N':
            scope.icon = 'fa-font';
            break;
          case 'Q':
            scope.icon = 'icon-hash';
            break;
          case 'T':
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
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', 'consts', 'Analytics', function ($location, $window, consts, Analytics) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARKTYPE_TOGGLE: {category: 'CHART', id:'MARKTYPE_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},

      //POLESTAR
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.DEBUG},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.DEBUG},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.DEBUG}
    };

    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels.INFO.rank) {
        Analytics.trackEvent(action.category, action.id, label, value);
        console.log('[Logging] ', action.id, label, data);
      }
    };

    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['Modals', function (Modals) {
    return {
      templateUrl: 'modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        scope.wrapperStyle = 'max-width:' + scope.maxWidth;

        // Default to closed
        scope.isOpen = false;

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        'closeCallback': '&onClose'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeCallback) {
            scope.closeCallback();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['vl', 'vg', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', function(vl, vg, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return b.priority - a.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight:'=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500,
          TOOLTIP_TIMEOUT = 250;

        scope.visId = (counter++);
        scope.hoverPromise = null;
        scope.tooltipPromise = null;
        scope.hoverFocus = false;
        scope.tooltipActive = false;
        scope.destroyed = false;
        var format = vl.format('');

        scope.mouseover = function() {
          scope.hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, '', scope.chart.vlSpec);
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseout = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, '', scope.chart.vlSpec);
          }

          $timeout.cancel(scope.hoverPromise);
          scope.hoverFocus = scope.unlocked = false;
        };

        function viewOnMouseOver(event, item) {
          if (!item.datum.data) { return; }

          scope.tooltipPromise = $timeout(function activateTooltip(){
            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum);

            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _.pairs(item.datum.data).map(function(p) {
              p[1] = vg.isNumber(p[1]) ? format(p[1]) : p[1];
              return p;
            });
            scope.$digest();

            var tooltip = element.find('.vis-tooltip'),
              $body = angular.element($document),
              width = tooltip.width(),
              height= tooltip.height();

            // put tooltip above if it's near the screen's bottom border
            if (event.pageY+10+height < $body.height()) {
              tooltip.css('top', (event.pageY+10));
            } else {
              tooltip.css('top', (event.pageY-10-height));
            }

            // put tooltip on left if it's near the screen's right border
            if (event.pageX+10+ width < $body.width()) {
              tooltip.css('left', (event.pageX+10));
            } else {
              tooltip.css('left', (event.pageX-10-width));
            }
          }, TOOLTIP_TIMEOUT);
        }

        function viewOnMouseOut(event, item) {
          //clear positions
          var tooltip = element.find('.vis-tooltip');
          tooltip.css('top', null);
          tooltip.css('left', null);
          $timeout.cancel(scope.tooltipPromise);
          if (scope.tooltipActive) {
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum);
          }
          scope.tooltipActive = false;
          scope.data = [];
          scope.$digest();
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) return;

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vl.extend(vlSpec.config, Config[configSet]());

          // use chart stats if available (for example from bookmarks)
          var stats = scope.chart.stats || Dataset.stats;

          return vl.compile(vlSpec, stats);
        }

        function rescaleIfEnable() {
          if (scope.rescale) {
            var xRatio = scope.maxWidth > 0 ?  scope.maxWidth / scope.width : 1;
            var yRatio = scope.maxHeight > 0 ? scope.maxHeight / scope.height  : 1;
            var ratio = Math.min(xRatio, yRatio);

            var niceRatio = 1;
            while (0.75 * niceRatio> ratio) {
              niceRatio /= 2;
            }

            var t = niceRatio * 100 / 2 && 0;
            element.find('.vega').css('transform', 'translate(-'+t+'%, -'+t+'%) scale('+niceRatio+')');
          } else {
            element.find('.vega').css('transform', null);
          }
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }

        function render(spec) {
          if (!spec) {
            if (view) {
              view.off('mouseover');
              view.off('mouseout');
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = scope.chart.shorthand || (scope.chart.vlSpec ? vl.Encoding.shorthand(scope.chart.vlSpec) : '');

          scope.renderer = getRenderer(spec);

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart.fieldSetKey))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(chart) {
              try {
                var endParse = new Date().getTime();
                view = null;
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                scope.width =  view.width();
                scope.height = view.height();
                view.renderer(getRenderer(spec.width, scope.height));
                view.update();

                Logger.logInteraction(Logger.actions.CHART_RENDER, '', scope.chart.vlSpec);
                  rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  view.on('mouseover', viewOnMouseOver);
                  view.on('mouseout', viewOnMouseOut);
                }
              } catch (e) {
                console.error(e);
              } finally {
                renderQueueNext();
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var view;
        scope.$watch('chart.vlSpec', function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            scope.chart.cleanSpec = vl.Encoding.fromSpec(scope.chart.vlSpec).toSpec(true);
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            view.off('mouseover');
            view.off('mouseout');
            view = null;
          }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'vl', 'Dataset', 'Drop', 'Logger', function (Bookmarks, consts, vl, Dataset, Drop, Logger) {
    return {
      templateUrl: 'vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
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
      link: function postLink(scope, element) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.Dataset = Dataset;

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

        scope.toggleFilterNull = function(spec, stats) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          vl.Encoding.toggleFilterNullO(spec, stats);
        };
        scope.toggleFilterNull.support = vl.Encoding.toggleFilterNullO.support;

        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: element.find('.fa-wrench')[0],
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

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
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', function() {
    return function(input) {
      return JSON.stringify(input, null, '  ', 80);
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('scaleType', function() {
    return function(input) {
      var scaleTypes = {
        Q: 'Quantitative',
        N: 'Nominal',
        O: 'Ordinal',
        T: 'Time'
      };

      return scaleTypes[input];
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.encoding) {
        var encoding = _.omit(params.encoding, 'config');
        encoding = encodeURI(compactJSONFilter(encoding));
        url += 'entry.1323680136=' + encoding + '&';
      }

      if (params.encoding2) {
        var encoding2 = _.omit(params.encoding2, 'config');
        encoding2 = encodeURI(compactJSONFilter(encoding2));
        url += 'entry.853137786=' + encoding2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.encoding) {
        var encoding = _.omit(params.encoding, 'config');
        encoding = encodeURI(compactJSONFilter(encoding));
        url += 'entry.1245199477=' + encoding + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIiwidGVtcGxhdGVDYWNoZUh0bWwuanMiLCJhbGVydHMvYWxlcnRzLnNlcnZpY2UuanMiLCJib29rbWFya2xpc3QvYm9va21hcmtsaXN0LmpzIiwiYm9va21hcmtzL2Jvb2ttYXJrcy5zZXJ2aWNlLmpzIiwiY29uZmlnL2NvbmZpZy5zZXJ2aWNlLmpzIiwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuanMiLCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuanMiLCJkYXRhc2V0L2RhdGFzZXQuc2VydmljZS5qcyIsImRhdGFzZXQvZGF0YXNldG1vZGFsLmpzIiwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuanMiLCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5qcyIsImRhdGFzZXQvcGFzdGVkYXRhc2V0LmpzIiwiZGF0YXNldC9zYW1wbGVkYXRhLmpzIiwiZmllbGRpbmZvL2ZpZWxkaW5mby5qcyIsImxvZ2dlci9sb2dnZXIuc2VydmljZS5qcyIsIm1vZGFsL21vZGFsLmpzIiwibW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5qcyIsIm1vZGFsL21vZGFscy5zZXJ2aWNlLmpzIiwidmVuZG9yL2pzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJ0YWJzL3RhYi5qcyIsInRhYnMvdGFic2V0LmpzIiwidmxwbG90L3ZscGxvdC5qcyIsInZscGxvdGdyb3VwL3ZscGxvdGdyb3VwLmpzIiwiZmlsdGVycy9jb21wYWN0anNvbi9jb21wYWN0anNvbi5maWx0ZXIuanMiLCJmaWx0ZXJzL2VuY29kZXVyaS9lbmNvZGV1cmkuZmlsdGVyLmpzIiwiZmlsdGVycy9zY2FsZXR5cGUvc2NhbGV0eXBlLmZpbHRlci5qcyIsImZpbHRlcnMvcmVwb3J0dXJsL3JlcG9ydHVybC5maWx0ZXIuanMiLCJmaWx0ZXJzL3VuZGVyc2NvcmUyc3BhY2UvdW5kZXJzY29yZTJzcGFjZS5maWx0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQUdBLFFBQVEsT0FBTyxRQUFRO0VBQ3JCO0VBQ0E7RUFDQTs7R0FFQyxTQUFTLEtBQUssT0FBTzs7R0FFckIsU0FBUyxNQUFNLE9BQU87R0FDdEIsU0FBUyxNQUFNLE9BQU87R0FDdEIsU0FBUyxNQUFNLE9BQU87O0dBRXRCLFNBQVMsUUFBUSxPQUFPO0dBQ3hCLFNBQVMsT0FBTyxPQUFPO0dBQ3ZCLFNBQVMsUUFBUSxPQUFPO0dBQ3hCLFNBQVMsUUFBUSxPQUFPOztHQUV4QixTQUFTLFVBQVU7SUFDbEIsVUFBVTtJQUNWLE9BQU87SUFDUCxRQUFRO0lBQ1IsU0FBUztJQUNULGtCQUFrQjtJQUNsQixPQUFPOztJQUVQLGNBQWMsT0FBTyxZQUFZO0lBQ2pDLFVBQVU7TUFDUixVQUFVO01BQ1YsT0FBTztNQUNQLFNBQVM7O0lBRVgsV0FBVztJQUNYLFdBQVc7TUFDVCxHQUFHO01BQ0gsR0FBRztNQUNILEdBQUc7TUFDSCxHQUFHO01BQ0gsR0FBRzs7O0dBR04sNkJBQU8sVUFBVSxtQkFBbUI7SUFDbkM7T0FDRyxXQUFXLEVBQUUsU0FBUyxpQkFBaUIsTUFBTSxXQUFXLFlBQVk7O0FBRTNFOzs7QUM5Q0EsUUFBUSxPQUFPLFFBQVEsSUFBSSxDQUFDLGtCQUFrQixTQUFTLGdCQUFnQixDQUFDLGVBQWUsSUFBSSxpQ0FBaUM7QUFDNUgsZUFBZSxJQUFJLCtCQUErQjtBQUNsRCxlQUFlLElBQUksNkJBQTZCO0FBQ2hELGVBQWUsSUFBSSw0QkFBNEI7QUFDL0MsZUFBZSxJQUFJLCtCQUErQjtBQUNsRCxlQUFlLElBQUksNEJBQTRCO0FBQy9DLGVBQWUsSUFBSSw0QkFBNEI7QUFDL0MsZUFBZSxJQUFJLDJCQUEyQjtBQUM5QyxlQUFlLElBQUksbUJBQW1CO0FBQ3RDLGVBQWUsSUFBSSw4QkFBOEI7QUFDakQsZUFBZSxJQUFJLGdCQUFnQjtBQUNuQyxlQUFlLElBQUksbUJBQW1CO0FBQ3RDLGVBQWUsSUFBSSwrQkFBK0I7QUFDbEQsZUFBZSxJQUFJLHFCQUFxQixnckJBQWdyQjs7OztBQ2J4dEI7O0FBRUEsUUFBUSxPQUFPO0dBQ1osUUFBUSw0QkFBVSxTQUFTLFVBQVUsR0FBRztJQUN2QyxJQUFJLFNBQVM7O0lBRWIsT0FBTyxTQUFTOztJQUVoQixPQUFPLE1BQU0sU0FBUyxLQUFLLFNBQVM7TUFDbEMsSUFBSSxVQUFVLENBQUMsS0FBSztNQUNwQixPQUFPLE9BQU8sS0FBSztNQUNuQixJQUFJLFNBQVM7UUFDWCxTQUFTLFdBQVc7VUFDbEIsSUFBSSxRQUFRLEVBQUUsVUFBVSxPQUFPLFFBQVE7VUFDdkMsT0FBTyxXQUFXO1dBQ2pCOzs7O0lBSVAsT0FBTyxhQUFhLFNBQVMsT0FBTztNQUNsQyxPQUFPLE9BQU8sT0FBTyxPQUFPOzs7SUFHOUIsT0FBTzs7QUFFWDs7O0FDekJBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsa0RBQWdCLFVBQVUsV0FBVyxRQUFRLFFBQVE7SUFDOUQsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULE9BQU87UUFDTCxhQUFhOztNQUVmLE1BQU0sU0FBUyxTQUFTLDRCQUE0Qjs7OztRQUlsRCxPQUFPLGVBQWUsT0FBTyxRQUFRO1FBQ3JDLE1BQU0scUJBQXFCLFdBQVc7VUFDcEMsT0FBTyxlQUFlLE9BQU8sUUFBUTs7O1FBR3ZDLE1BQU0sWUFBWTtRQUNsQixNQUFNLFNBQVM7Ozs7QUFJdkI7OztBQy9CQTs7Ozs7Ozs7O0FBU0EsUUFBUSxPQUFPO0dBQ1osUUFBUSxxRUFBYSxTQUFTLEdBQUcsSUFBSSxxQkFBcUIsUUFBUSxTQUFTO0lBQzFFLElBQUksWUFBWSxXQUFXO01BQ3pCLEtBQUssT0FBTztNQUNaLEtBQUssU0FBUztNQUNkLEtBQUssY0FBYyxvQkFBb0I7OztJQUd6QyxJQUFJLFFBQVEsVUFBVTs7SUFFdEIsTUFBTSxlQUFlLFdBQVc7TUFDOUIsS0FBSyxTQUFTLE9BQU8sS0FBSyxLQUFLLE1BQU07OztJQUd2QyxNQUFNLE9BQU8sV0FBVztNQUN0QixvQkFBb0IsSUFBSSxhQUFhLEtBQUs7OztJQUc1QyxNQUFNLE9BQU8sV0FBVztNQUN0QixLQUFLLE9BQU8sb0JBQW9CLElBQUksZ0JBQWdCO01BQ3BELEtBQUs7OztJQUdQLE1BQU0sUUFBUSxXQUFXO01BQ3ZCLEtBQUssT0FBTztNQUNaLEtBQUs7TUFDTCxLQUFLOztNQUVMLE9BQU8sZUFBZSxPQUFPLFFBQVE7OztJQUd2QyxNQUFNLFNBQVMsU0FBUyxPQUFPO01BQzdCLElBQUksWUFBWSxNQUFNOztNQUV0QixJQUFJLEtBQUssS0FBSyxZQUFZO1FBQ3hCLEtBQUssT0FBTzthQUNQO1FBQ0wsS0FBSyxJQUFJOzs7O0lBSWIsTUFBTSxNQUFNLFNBQVMsT0FBTztNQUMxQixJQUFJLFlBQVksTUFBTTs7TUFFdEIsUUFBUSxJQUFJLFVBQVUsTUFBTSxRQUFROztNQUVwQyxNQUFNLGFBQWEsSUFBSSxPQUFPOztNQUU5QixNQUFNLFFBQVEsUUFBUTs7TUFFdEIsS0FBSyxLQUFLLGFBQWEsRUFBRSxVQUFVO01BQ25DLEtBQUs7TUFDTCxLQUFLOztNQUVMLE9BQU8sZUFBZSxPQUFPLFFBQVEsY0FBYzs7O0lBR3JELE1BQU0sU0FBUyxTQUFTLE9BQU87TUFDN0IsSUFBSSxZQUFZLE1BQU07O01BRXRCLFFBQVEsSUFBSSxZQUFZLE1BQU0sUUFBUTs7TUFFdEMsT0FBTyxLQUFLLEtBQUs7TUFDakIsS0FBSztNQUNMLEtBQUs7O01BRUwsT0FBTyxlQUFlLE9BQU8sUUFBUSxpQkFBaUI7OztJQUd4RCxNQUFNLGVBQWUsU0FBUyxXQUFXO01BQ3ZDLE9BQU8sYUFBYSxLQUFLOzs7SUFHM0IsT0FBTyxJQUFJOztBQUVmOzs7QUNwRkE7Ozs7QUFJQSxRQUFRLE9BQU87R0FDWixRQUFRLHNCQUFVLFNBQVMsSUFBSSxHQUFHO0lBQ2pDLElBQUksU0FBUzs7SUFFYixPQUFPLFNBQVMsR0FBRyxPQUFPLE9BQU8sV0FBVztJQUM1QyxPQUFPLGFBQWEsR0FBRyxPQUFPLE9BQU8sV0FBVzs7SUFFaEQsT0FBTyxPQUFPLEdBQUcsT0FBTyxLQUFLLFlBQVksT0FBTztJQUNoRCxPQUFPLFNBQVMsR0FBRyxPQUFPLEtBQUssWUFBWSxPQUFPOztJQUVsRCxPQUFPLFlBQVksV0FBVztNQUM1QixPQUFPLEVBQUUsVUFBVSxPQUFPOzs7SUFHNUIsT0FBTyxVQUFVLFdBQVc7TUFDMUIsT0FBTyxFQUFFLFVBQVUsT0FBTzs7O0lBRzVCLE9BQU8sUUFBUSxXQUFXO01BQ3hCLE9BQU87UUFDTCxhQUFhO1FBQ2IsY0FBYztRQUNkLHlCQUF5Qjs7OztJQUk3QixPQUFPLFFBQVEsV0FBVztNQUN4QixPQUFPOzs7SUFHVCxPQUFPLGdCQUFnQixTQUFTLFNBQVMsTUFBTTtNQUM3QyxJQUFJLFFBQVEsUUFBUTtRQUNsQixPQUFPLEtBQUssU0FBUyxRQUFRO1FBQzdCLE9BQU8sT0FBTyxLQUFLO1FBQ25CLE9BQU8sS0FBSyxhQUFhO2FBQ3BCO1FBQ0wsT0FBTyxLQUFLLE1BQU0sUUFBUTtRQUMxQixPQUFPLE9BQU8sS0FBSztRQUNuQixPQUFPLEtBQUssYUFBYTs7OztJQUk3QixPQUFPOztBQUVYOzs7QUNoREE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxrREFBbUIsVUFBVSxPQUFPLFNBQVMsUUFBUTtJQUM5RCxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixTQUFTO01BQ1QsU0FBUztNQUNULE9BQU87TUFDUCxNQUFNLFNBQVMsU0FBUyxPQUFPLFNBQVMsT0FBTyxpQkFBaUI7OztRQUc5RCxTQUFTLGFBQWE7VUFDcEIsSUFBSSxpQkFBaUI7WUFDbkIsZ0JBQWdCOzs7OztRQUtwQixNQUFNLGVBQWUsT0FBTztRQUM1QixNQUFNLGdCQUFnQjtRQUN0QixNQUFNLGVBQWU7O1FBRXJCLE1BQU0sZUFBZSxTQUFTLE9BQU87VUFDbkMsT0FBTyxNQUFNLElBQUksTUFBTSxlQUFlLHdCQUF3QjthQUMzRCxLQUFLLFNBQVMsVUFBVTtjQUN2QixNQUFNLGdCQUFnQixTQUFTOzs7O1FBSXJDLE1BQU0sYUFBYSxTQUFTLGNBQWM7VUFDeEMsSUFBSSxVQUFVO1lBQ1osT0FBTztZQUNQLE1BQU0sYUFBYTtZQUNuQixLQUFLLE1BQU0sZUFBZSxtQkFBbUIsYUFBYTtjQUN4RCxjQUFjLGFBQWE7Y0FDM0IsZUFBZSxhQUFhLGVBQWU7OztVQUcvQyxRQUFRLE9BQU87VUFDZixRQUFRLFVBQVUsUUFBUSxJQUFJO1VBQzlCLFFBQVEsT0FBTyxRQUFROztVQUV2Qjs7Ozs7QUFLVjs7O0FDdkRBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsdUNBQWlCLFVBQVUsU0FBUyxRQUFRO0lBQ3JELE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxTQUFTO01BQ1QsT0FBTztNQUNQLE1BQU0sU0FBUyxTQUFTLE9BQU8sU0FBUyxPQUFPLGlCQUFpQjs7O1FBRzlELFNBQVMsYUFBYTtVQUNwQixJQUFJLGlCQUFpQjtZQUNuQixnQkFBZ0I7Ozs7O1FBS3BCLE1BQU0sZUFBZTtVQUNuQixPQUFPOzs7UUFHVCxNQUFNLGFBQWEsU0FBUyxTQUFTO1VBQ25DLE9BQU8sZUFBZSxPQUFPLFFBQVEsaUJBQWlCLFFBQVE7OztVQUc5RCxRQUFRLFVBQVUsUUFBUSxJQUFJOzs7VUFHOUIsUUFBUSxPQUFPLFFBQVE7O1VBRXZCOzs7OztBQUtWOzs7QUM1Q0E7O0FBRUEsU0FBUyxXQUFXLFlBQVk7RUFDOUIsT0FBTyxXQUFXLE9BQU8sU0FBUyxHQUFHLE9BQU87SUFDMUMsRUFBRSxNQUFNLFFBQVE7SUFDaEIsT0FBTztLQUNOOzs7QUFHTCxRQUFRLE9BQU87R0FDWixRQUFRLHdGQUFXLFNBQVMsT0FBTyxJQUFJLFFBQVEsR0FBRyxJQUFJLElBQUksWUFBWSxRQUFRLFFBQVE7SUFDckYsSUFBSSxVQUFVOzs7SUFHZCxJQUFJLFdBQVc7O0lBRWYsUUFBUSxXQUFXO0lBQ25CLFFBQVEsVUFBVSxTQUFTO0lBQzNCLFFBQVEsaUJBQWlCO0lBQ3pCLFFBQVEsYUFBYTtJQUNyQixRQUFRLFdBQVcsU0FBUztJQUM1QixRQUFRLFFBQVE7SUFDaEIsUUFBUSxPQUFPOztJQUVmLElBQUksWUFBWTtNQUNkLEdBQUc7TUFDSCxHQUFHO01BQ0gsR0FBRztNQUNILEdBQUc7TUFDSCxHQUFHOzs7SUFHTCxRQUFRLGVBQWU7O0lBRXZCLFFBQVEsYUFBYSxPQUFPLFNBQVMsT0FBTztNQUMxQyxJQUFJLE1BQU0sWUFBWSxTQUFTLE9BQU87TUFDdEMsT0FBTyxVQUFVLE1BQU07OztJQUd6QixRQUFRLGFBQWEsZUFBZSxTQUFTLE9BQU87TUFDbEQsT0FBTyxRQUFRLGFBQWEsS0FBSyxTQUFTO1NBQ3ZDLE1BQU0sY0FBYyxVQUFVLE1BQU0sTUFBTSxLQUFLOzs7O0lBSXBELFFBQVEsYUFBYSxXQUFXLFdBQVc7TUFDekMsT0FBTzs7O0lBR1QsUUFBUSxhQUFhLE9BQU8sU0FBUyxPQUFPO01BQzFDLE9BQU8sTUFBTTs7O0lBR2YsUUFBUSxhQUFhLGNBQWMsU0FBUyxPQUFPLE9BQU87TUFDeEQsT0FBTyxNQUFNLE1BQU0sTUFBTTs7O0lBRzNCLFFBQVEsYUFBYSxRQUFRLGFBQWE7O0lBRTFDLFFBQVEsWUFBWSxTQUFTLE1BQU0sT0FBTyxPQUFPO01BQy9DLElBQUksUUFBUSxHQUFHLEtBQUssU0FBUztRQUMzQixTQUFTLEVBQUUsT0FBTyxPQUFPLFNBQVMsR0FBRyxNQUFNLE1BQU07VUFDL0MsSUFBSSxRQUFRO1lBQ1YsTUFBTTtZQUNOLE1BQU0sR0FBRyxLQUFLLE1BQU07WUFDcEIsZUFBZTs7O1VBR2pCLElBQUksTUFBTSxTQUFTLE9BQU8sTUFBTSxNQUFNLE1BQU0sWUFBWSxHQUFHO1lBQ3pELE1BQU0sT0FBTzs7O1VBR2YsRUFBRSxLQUFLO1VBQ1AsT0FBTztXQUNOOztNQUVMLFNBQVMsR0FBRyxXQUFXLFFBQVEsU0FBUyxRQUFRLGFBQWEsY0FBYyxRQUFRLGFBQWE7O01BRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU07TUFDckIsT0FBTzs7OztJQUlULFFBQVEsV0FBVzs7SUFFbkIsUUFBUSxTQUFTLFNBQVMsU0FBUztNQUNqQyxJQUFJOztNQUVKLE9BQU8sZUFBZSxPQUFPLFFBQVEsZ0JBQWdCLFFBQVE7O01BRTdELElBQUksUUFBUSxRQUFRO1FBQ2xCLGdCQUFnQixHQUFHLFNBQVMsU0FBUyxRQUFROztVQUUzQyxRQUFRLE9BQU87VUFDZixRQUFRLGVBQWUsU0FBUyxRQUFRO1VBQ3hDOzthQUVHO1FBQ0wsZ0JBQWdCLE1BQU0sSUFBSSxRQUFRLEtBQUssQ0FBQyxPQUFPLE9BQU8sS0FBSyxTQUFTLFVBQVU7VUFDNUUsSUFBSTs7O1VBR0osSUFBSSxFQUFFLFNBQVMsU0FBUyxPQUFPO2FBQzVCLE9BQU8sU0FBUzthQUNoQixRQUFRLE9BQU87aUJBQ1g7WUFDTCxPQUFPLEdBQUcsS0FBSyxTQUFTLE1BQU0sQ0FBQyxNQUFNO1lBQ3JDLFFBQVEsT0FBTzs7O1VBR2pCLFFBQVEsZUFBZSxTQUFTOzs7O01BSXBDLFFBQVEsU0FBUyxRQUFRLFNBQVMsVUFBVTtRQUMxQyxnQkFBZ0IsY0FBYyxLQUFLOzs7O01BSXJDLGNBQWMsS0FBSyxXQUFXO1FBQzVCLE9BQU8sY0FBYyxTQUFTLFFBQVE7OztNQUd4QyxPQUFPOzs7SUFHVCxRQUFRLGlCQUFpQixTQUFTLFNBQVMsTUFBTTtNQUMvQyxRQUFRLE9BQU87O01BRWYsUUFBUSxpQkFBaUI7TUFDekIsUUFBUSxRQUFRLEdBQUcsS0FBSyxNQUFNLFFBQVE7O01BRXRDLEtBQUssSUFBSSxhQUFhLFFBQVEsT0FBTztRQUNuQyxJQUFJLGNBQWMsS0FBSztVQUNyQixRQUFRLE1BQU0sV0FBVyxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sUUFBUSxNQUFNLFlBQVk7Ozs7TUFJakYsUUFBUSxhQUFhLFFBQVEsVUFBVSxRQUFRLE1BQU0sUUFBUTtNQUM3RCxRQUFRLFdBQVcsU0FBUyxXQUFXLFFBQVE7OztJQUdqRCxRQUFRLE1BQU0sU0FBUyxTQUFTO01BQzlCLElBQUksQ0FBQyxRQUFRLElBQUk7UUFDZixRQUFRLEtBQUssUUFBUTs7TUFFdkIsU0FBUyxLQUFLOztNQUVkLE9BQU87OztJQUdULE9BQU87O0FBRVg7OztBQ3pKQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLGdCQUFnQixZQUFZO0lBQ3JDLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLE9BQU87OztBQUdiOzs7QUNoQkE7O0FBRUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxtREFBbUIsU0FBUyxTQUFTLFFBQVEsUUFBUTtJQUM5RCxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixTQUFTO01BQ1QsT0FBTztNQUNQLE1BQU0sU0FBUyxTQUFTLDJCQUEyQjtRQUNqRCxNQUFNLFVBQVU7O1FBRWhCLE1BQU0saUJBQWlCLFdBQVc7VUFDaEMsSUFBSSxDQUFDLFFBQVEsU0FBUzs7WUFFcEIsUUFBUSxVQUFVLFFBQVE7WUFDMUIsT0FBTyxlQUFlLE9BQU8sUUFBUTtZQUNyQyxPQUFPLEtBQUs7WUFDWjs7O1VBR0YsUUFBUSxPQUFPLFFBQVE7Ozs7O0FBS2pDOzs7QUMxQkE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPOztHQUVaLFNBQVMsY0FBYyxPQUFPO0dBQzlCLFVBQVUsbURBQWdCLFVBQVUsUUFBUSxRQUFRLFlBQVk7Ozs7SUFJL0QsU0FBUyxZQUFZLE1BQU0sU0FBUzs7O01BR2xDLElBQUksQ0FBQyxXQUFXLE9BQU8sT0FBTyxPQUFPLENBQUMsU0FBUzs7UUFFN0MsT0FBTzs7O01BR1QsT0FBTyxJQUFJLCtCQUErQixVQUFVO01BQ3BELE9BQU87OztJQUdULFNBQVMsWUFBWSxNQUFNLGdCQUFnQjtNQUN6QyxJQUFJLENBQUMsa0JBQWtCLGVBQWUsUUFBUSxRQUFRLENBQUMsR0FBRzs7O1FBR3hELE9BQU87O01BRVQsT0FBTyxJQUFJLDZEQUE2RDtNQUN4RSxPQUFPOzs7SUFHVCxPQUFPO01BQ0wsYUFBYTtNQUNiLFNBQVM7TUFDVCxVQUFVOztNQUVWLFlBQVk7TUFDWixPQUFPO1FBQ0wsYUFBYTtRQUNiLGdCQUFnQjs7O1FBR2hCLFNBQVM7O01BRVgsTUFBTSxVQUFVLE9BQU8sb0JBQW9CO1FBQ3pDLE1BQU0sVUFBVSxNQUFNLFdBQVc7O1FBRWpDLFFBQVEsR0FBRyxzQkFBc0IsU0FBUyxZQUFZLE9BQU87VUFDM0QsSUFBSSxPQUFPO1lBQ1QsTUFBTTs7VUFFUixNQUFNLGNBQWMsYUFBYSxnQkFBZ0I7OztRQUduRCxTQUFTLFNBQVMsTUFBTTtVQUN0QixJQUFJLENBQUMsWUFBWSxLQUFLLE1BQU0sTUFBTSxpQkFBaUI7WUFDakQ7O1VBRUYsSUFBSSxDQUFDLFlBQVksS0FBSyxNQUFNLE1BQU0sY0FBYztZQUM5Qzs7VUFFRixJQUFJLFNBQVMsSUFBSTs7VUFFakIsT0FBTyxTQUFTLFNBQVMsS0FBSztZQUM1QixPQUFPLE1BQU0sT0FBTyxTQUFTLE9BQU87Y0FDbEMsTUFBTSxRQUFRLE9BQU8sSUFBSSxPQUFPOztjQUVoQyxNQUFNLFFBQVEsT0FBTyxLQUFLLEtBQUssUUFBUSxVQUFVOzs7O1VBSXJELE9BQU8sVUFBVSxXQUFXO1lBQzFCLE9BQU8sSUFBSTs7O1VBR2IsT0FBTyxXQUFXOzs7UUFHcEIsUUFBUSxHQUFHLFFBQVEsU0FBUyxPQUFPLE9BQU87VUFDeEMsSUFBSSxPQUFPO1lBQ1QsTUFBTTs7O1VBR1IsU0FBUyxNQUFNLGNBQWMsYUFBYSxNQUFNOzs7UUFHbEQsUUFBUSxLQUFLLHNCQUFzQixHQUFHLFVBQVUsU0FBUyxvQkFBb0I7O1VBRTNFLFNBQVMsS0FBSyxNQUFNOzs7Ozs7QUFNOUI7OztBQ3BHQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLHFFQUFnQixVQUFVLFNBQVMsUUFBUSxRQUFRLFFBQVEsR0FBRyxJQUFJO0lBQzNFLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxTQUFTO01BQ1QsT0FBTztNQUNQLE1BQU0sU0FBUyxTQUFTLE9BQU8sU0FBUyxPQUFPLGlCQUFpQjs7O1FBRzlELFNBQVMsYUFBYTtVQUNwQixJQUFJLGlCQUFpQjtZQUNuQixnQkFBZ0I7Ozs7O1FBS3BCLE1BQU0sVUFBVTtVQUNkLE1BQU07VUFDTixNQUFNOzs7UUFHUixNQUFNLGFBQWEsV0FBVztVQUM1QixJQUFJLE9BQU8sR0FBRyxLQUFLLE1BQU0sUUFBUSxNQUFNO1lBQ3JDLE1BQU07OztVQUdSLElBQUksZ0JBQWdCO1lBQ2xCLElBQUksS0FBSztZQUNULE1BQU0sTUFBTSxRQUFRO1lBQ3BCLFFBQVE7WUFDUixPQUFPOzs7O1VBSVQsT0FBTyxlQUFlLE9BQU8sUUFBUSxtQkFBbUIsY0FBYzs7O1VBR3RFLFFBQVEsVUFBVSxRQUFRLElBQUk7OztVQUc5QixRQUFRLE9BQU8sUUFBUTs7O1VBR3ZCOzs7OztBQUtWOzs7QUMxREEsUUFBUSxPQUFPLFFBQVEsU0FBUyxjQUFjLENBQUM7RUFDN0MsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTztFQUNQO0VBQ0EsTUFBTTtFQUNOLEtBQUs7RUFDTCxJQUFJO0VBQ0osT0FBTzs7QUFFVDs7O0FDbEVBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsaURBQWEsVUFBVSxTQUFTLE1BQU0sSUFBSSxRQUFRO0lBQzNELE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxPQUFPO1FBQ0wsT0FBTztRQUNQLFVBQVU7UUFDVixVQUFVO1FBQ1YsV0FBVztRQUNYLGNBQWM7UUFDZCxZQUFZO1FBQ1osY0FBYztRQUNkLFFBQVE7UUFDUixtQkFBbUI7O01BRXJCLE1BQU0sU0FBUyxPQUFPLFNBQVM7UUFDN0IsSUFBSTs7UUFFSixNQUFNLFlBQVksT0FBTztRQUN6QixNQUFNLFFBQVEsUUFBUSxNQUFNLE1BQU0sTUFBTTtRQUN4QyxNQUFNLFVBQVUsR0FBRyxNQUFNOztRQUV6QixPQUFPLE1BQU0sTUFBTTtVQUNqQixLQUFLO1lBQ0gsTUFBTSxPQUFPO1lBQ2I7VUFDRixLQUFLO1lBQ0gsTUFBTSxPQUFPO1lBQ2I7VUFDRixLQUFLO1lBQ0gsTUFBTSxPQUFPO1lBQ2I7VUFDRixLQUFLO1lBQ0gsTUFBTSxPQUFPO1lBQ2I7OztRQUdKLE1BQU0sVUFBVSxTQUFTLE9BQU87VUFDOUIsR0FBRyxNQUFNLFVBQVUsT0FBTyxXQUFXLFFBQVEsS0FBSyxrQkFBa0I7WUFDbEUsT0FBTyxXQUFXLFFBQVEsS0FBSyxhQUFhLElBQUk7WUFDaEQsTUFBTSxPQUFPOzs7O1FBSWpCLE1BQU0sT0FBTyxTQUFTLE9BQU87VUFDM0IsT0FBTyxNQUFNLGFBQWEsTUFBTTthQUM3QixNQUFNLE9BQU87WUFDZCxNQUFNLGNBQWMsTUFBTTthQUN6QixNQUFNLFFBQVEsV0FBVyxNQUFNLFFBQVE7OztRQUc1QyxNQUFNLE9BQU8sZ0JBQWdCLFNBQVMsY0FBYztVQUNsRCxJQUFJLENBQUMsY0FBYyxFQUFFOztVQUVyQixJQUFJLFlBQVk7WUFDZCxXQUFXOzs7VUFHYixhQUFhLElBQUksS0FBSztZQUNwQixTQUFTO1lBQ1QsUUFBUSxRQUFRLEtBQUssZUFBZTtZQUNwQyxVQUFVO1lBQ1YsUUFBUTs7OztRQUlaLE1BQU0sSUFBSSxZQUFZLFdBQVc7VUFDL0IsSUFBSSxZQUFZO1lBQ2QsV0FBVzs7Ozs7O0FBTXZCOzs7QUNwRkE7Ozs7Ozs7OztBQVNBLFFBQVEsT0FBTztHQUNaLFFBQVEsMERBQVUsVUFBVSxXQUFXLFNBQVMsUUFBUSxXQUFXOztJQUVsRSxJQUFJLFVBQVU7O0lBRWQsUUFBUSxTQUFTO01BQ2YsS0FBSyxDQUFDLEdBQUcsT0FBTyxLQUFLO01BQ3JCLE9BQU8sQ0FBQyxHQUFHLFNBQVMsS0FBSztNQUN6QixPQUFPLENBQUMsR0FBRyxTQUFTLEtBQUs7TUFDekIsTUFBTSxDQUFDLEdBQUcsUUFBUSxLQUFLO01BQ3ZCLE1BQU0sQ0FBQyxHQUFHLFFBQVEsS0FBSztNQUN2QixPQUFPLENBQUMsR0FBRyxTQUFTLEtBQUs7TUFDekIsT0FBTyxDQUFDLEdBQUcsU0FBUyxLQUFLOzs7SUFHM0IsUUFBUSxVQUFVOztNQUVoQixZQUFZLENBQUMsVUFBVSxRQUFRLElBQUksY0FBYyxPQUFPLFFBQVEsT0FBTztNQUN2RSxNQUFNLENBQUMsVUFBVSxRQUFRLElBQUksUUFBUSxPQUFPLFFBQVEsT0FBTztNQUMzRCxNQUFNLENBQUMsVUFBVSxRQUFRLElBQUksUUFBUSxPQUFPLFFBQVEsT0FBTztNQUMzRCxnQkFBZ0IsQ0FBQyxVQUFVLFFBQVEsSUFBSSxrQkFBa0IsT0FBTyxRQUFRLE9BQU87TUFDL0UsY0FBYyxDQUFDLFVBQVUsUUFBUSxJQUFJLGdCQUFnQixPQUFPLFFBQVEsT0FBTztNQUMzRSxtQkFBbUIsQ0FBQyxVQUFVLFFBQVEsSUFBSSxxQkFBcUIsT0FBTyxRQUFRLE9BQU87TUFDckYsaUJBQWlCLENBQUMsVUFBVSxRQUFRLElBQUksbUJBQW1CLE9BQU8sUUFBUSxPQUFPOztNQUVqRixjQUFjLENBQUMsVUFBVSxZQUFZLEdBQUcsZ0JBQWdCLE9BQU8sUUFBUSxPQUFPO01BQzlFLGlCQUFpQixDQUFDLFVBQVUsWUFBWSxHQUFHLG1CQUFtQixPQUFPLFFBQVEsT0FBTztNQUNwRixlQUFlLENBQUMsVUFBVSxZQUFZLEdBQUcsaUJBQWlCLE9BQU8sUUFBUSxPQUFPO01BQ2hGLGdCQUFnQixDQUFDLFVBQVUsWUFBWSxHQUFHLGtCQUFrQixPQUFPLFFBQVEsT0FBTztNQUNsRixnQkFBZ0IsQ0FBQyxVQUFVLFlBQVksSUFBSSxrQkFBa0IsT0FBTyxRQUFRLE9BQU87O01BRW5GLGlCQUFpQixDQUFDLFVBQVUsU0FBUyxHQUFHLG1CQUFtQixPQUFPLFFBQVEsT0FBTztNQUNqRixnQkFBZ0IsQ0FBQyxVQUFVLFNBQVMsR0FBRyxrQkFBa0IsT0FBTyxRQUFRLE9BQU87TUFDL0UsY0FBYyxDQUFDLFVBQVUsU0FBUyxHQUFHLGdCQUFnQixPQUFPLFFBQVEsT0FBTztNQUMzRSxjQUFjLENBQUMsVUFBVSxTQUFTLEdBQUcsZ0JBQWdCLE9BQU8sUUFBUSxPQUFPO01BQzNFLGVBQWUsQ0FBQyxVQUFVLFNBQVMsR0FBRyxpQkFBaUIsT0FBTyxRQUFRLE9BQU87TUFDN0UsbUJBQW1CLENBQUMsVUFBVSxTQUFTLEdBQUcscUJBQXFCLE9BQU8sUUFBUSxPQUFPOztNQUVyRixhQUFhLENBQUMsVUFBVSxTQUFTLEdBQUcsZUFBZSxPQUFPLFFBQVEsT0FBTztNQUN6RSxpQkFBaUIsQ0FBQyxVQUFVLFNBQVMsR0FBRyxtQkFBbUIsT0FBTyxRQUFRLE9BQU87TUFDakYsaUJBQWlCLENBQUMsVUFBVSxTQUFTLEdBQUcsbUJBQW1CLE9BQU8sUUFBUSxPQUFPO01BQ2pGLGtCQUFrQixDQUFDLFVBQVUsU0FBUyxJQUFJLG9CQUFvQixPQUFPLFFBQVEsT0FBTztNQUNwRixZQUFZLENBQUMsVUFBVSxTQUFTLElBQUksY0FBYyxPQUFPLFFBQVEsT0FBTztNQUN4RSxrQkFBa0IsQ0FBQyxVQUFVLFNBQVMsSUFBSSxvQkFBb0IsT0FBTyxRQUFRLE9BQU87TUFDcEYsb0JBQW9CLENBQUMsVUFBVSxTQUFTLEdBQUcsc0JBQXNCLE9BQU8sUUFBUSxPQUFPOztNQUV2RixnQkFBZ0IsQ0FBQyxVQUFVLFNBQVMsR0FBRyxrQkFBa0IsT0FBTyxRQUFRLE9BQU87TUFDL0UsV0FBVyxDQUFDLFVBQVUsU0FBUyxHQUFHLGFBQWEsT0FBTyxRQUFRLE9BQU87OztNQUdyRSxlQUFlLENBQUMsVUFBVSxVQUFVLElBQUksaUJBQWlCLE9BQU8sUUFBUSxPQUFPO01BQy9FLGNBQWMsQ0FBQyxVQUFVLFVBQVUsSUFBSSxnQkFBZ0IsT0FBTyxRQUFRLE9BQU87TUFDN0UsYUFBYSxDQUFDLFVBQVUsVUFBVSxJQUFJLGVBQWUsT0FBTyxRQUFRLE9BQU87OztNQUczRSxhQUFhLENBQUMsU0FBUyxZQUFZLElBQUksZUFBZSxPQUFPLFFBQVEsT0FBTztNQUM1RSxZQUFZLENBQUMsVUFBVSxZQUFZLElBQUksY0FBYyxPQUFPLFFBQVEsT0FBTztNQUMzRSxhQUFhLENBQUMsVUFBVSxZQUFZLElBQUksZUFBZSxPQUFPLFFBQVEsT0FBTzs7O0lBRy9FLFFBQVEsaUJBQWlCLFNBQVMsUUFBUSxPQUFPLE1BQU07TUFDckQsSUFBSSxDQUFDLE9BQU8sU0FBUztRQUNuQjs7TUFFRixJQUFJLFFBQVEsT0FBTyxLQUFLLFFBQVE7TUFDaEMsR0FBRyxPQUFPLE1BQU0sUUFBUSxRQUFRLE9BQU8sS0FBSyxNQUFNO1FBQ2hELFVBQVUsV0FBVyxPQUFPLFVBQVUsT0FBTyxJQUFJLE9BQU87UUFDeEQsUUFBUSxJQUFJLGNBQWMsT0FBTyxJQUFJLE9BQU87Ozs7SUFJaEQsUUFBUSxlQUFlLFFBQVEsUUFBUSxZQUFZLE9BQU87O0lBRTFELE9BQU87O0FBRVg7OztBQ3BGQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLG9CQUFTLFVBQVUsUUFBUTtJQUNwQyxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixZQUFZO01BQ1osT0FBTztRQUNMLFVBQVU7OztNQUdaLHVCQUFZLFNBQVMsUUFBUTtRQUMzQixLQUFLLFFBQVEsV0FBVztVQUN0QixPQUFPLFNBQVM7OztNQUdwQixNQUFNLFNBQVMsT0FBTyxTQUFTLE9BQU87UUFDcEMsSUFBSSxVQUFVLE1BQU07O1FBRXBCLE1BQU0sZUFBZSxlQUFlLE1BQU07OztRQUcxQyxNQUFNLFNBQVM7OztRQUdmLE9BQU8sU0FBUyxTQUFTO1FBQ3pCLE1BQU0sSUFBSSxZQUFZLFdBQVc7VUFDL0IsT0FBTyxXQUFXOzs7OztBQUs1Qjs7O0FDdkNBOzs7Ozs7OztBQVFBLFFBQVEsT0FBTztHQUNaLFVBQVUsb0JBQW9CLFdBQVc7SUFDeEMsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsU0FBUztNQUNULE9BQU87UUFDTCxpQkFBaUI7O01BRW5CLE1BQU0sU0FBUyxPQUFPLFNBQVMsT0FBTyxpQkFBaUI7UUFDckQsTUFBTSxhQUFhLFdBQVc7VUFDNUIsZ0JBQWdCO1VBQ2hCLElBQUksTUFBTSxlQUFlO1lBQ3ZCLE1BQU07Ozs7OztBQU1sQjs7O0FDM0JBOzs7Ozs7Ozs7QUFTQSxRQUFRLE9BQU87R0FDWixRQUFRLDRCQUFVLFVBQVUsZUFBZTs7Ozs7SUFLMUMsSUFBSSxjQUFjLGNBQWM7OztJQUdoQyxPQUFPO01BQ0wsVUFBVSxTQUFTLElBQUksT0FBTztRQUM1QixJQUFJLFlBQVksSUFBSSxLQUFLO1VBQ3ZCLFFBQVEsTUFBTSx3Q0FBd0M7VUFDdEQ7O1FBRUYsWUFBWSxJQUFJLElBQUk7OztNQUd0QixZQUFZLFNBQVMsSUFBSTtRQUN2QixZQUFZLE9BQU87Ozs7TUFJckIsTUFBTSxTQUFTLElBQUk7UUFDakIsSUFBSSxhQUFhLFlBQVksSUFBSTtRQUNqQyxJQUFJLENBQUMsWUFBWTtVQUNmLFFBQVEsTUFBTSwyQkFBMkI7VUFDekM7O1FBRUYsV0FBVyxTQUFTOzs7O01BSXRCLE9BQU8sU0FBUyxJQUFJO1FBQ2xCLElBQUksYUFBYSxZQUFZLElBQUk7UUFDakMsSUFBSSxDQUFDLFlBQVk7VUFDZixRQUFRLE1BQU0sMkJBQTJCO1VBQ3pDOztRQUVGLFdBQVcsU0FBUzs7O01BR3RCLE9BQU8sV0FBVztRQUNoQixZQUFZOzs7TUFHZCxPQUFPLFdBQVc7UUFDaEIsT0FBTyxZQUFZLE9BQU87Ozs7QUFJbEM7OztBQzVEQTs7Ozs7QUFLQSxDQUFDLENBQUMsWUFBWTs7O0VBR1osSUFBSSxXQUFXLE9BQU8sV0FBVyxjQUFjLE9BQU87OztFQUd0RCxJQUFJLGNBQWM7SUFDaEIsWUFBWTtJQUNaLFVBQVU7Ozs7RUFJWixJQUFJLGNBQWMsWUFBWSxPQUFPLFlBQVksV0FBVyxDQUFDLFFBQVEsWUFBWTs7Ozs7O0VBTWpGLElBQUksT0FBTyxZQUFZLE9BQU8sV0FBVyxVQUFVO01BQy9DLGFBQWEsZUFBZSxZQUFZLE9BQU8sV0FBVyxVQUFVLENBQUMsT0FBTyxZQUFZLE9BQU8sVUFBVSxZQUFZOztFQUV6SCxJQUFJLGVBQWUsV0FBVyxjQUFjLGNBQWMsV0FBVyxjQUFjLGNBQWMsV0FBVyxZQUFZLGFBQWE7SUFDbkksT0FBTzs7Ozs7RUFLVCxTQUFTLGFBQWEsU0FBUyxTQUFTO0lBQ3RDLFlBQVksVUFBVSxLQUFLO0lBQzNCLFlBQVksVUFBVSxLQUFLOzs7SUFHM0IsSUFBSSxTQUFTLFFBQVEsYUFBYSxLQUFLO1FBQ25DLFNBQVMsUUFBUSxhQUFhLEtBQUs7UUFDbkMsU0FBUyxRQUFRLGFBQWEsS0FBSztRQUNuQyxPQUFPLFFBQVEsV0FBVyxLQUFLO1FBQy9CLGNBQWMsUUFBUSxrQkFBa0IsS0FBSztRQUM3QyxZQUFZLFFBQVEsZ0JBQWdCLEtBQUs7UUFDekMsT0FBTyxRQUFRLFdBQVcsS0FBSztRQUMvQixhQUFhLFFBQVEsV0FBVyxLQUFLOzs7SUFHekMsSUFBSSxPQUFPLGNBQWMsWUFBWSxZQUFZO01BQy9DLFFBQVEsWUFBWSxXQUFXO01BQy9CLFFBQVEsUUFBUSxXQUFXOzs7O0lBSTdCLElBQUksY0FBYyxPQUFPO1FBQ3JCLFdBQVcsWUFBWTtRQUN2QixZQUFZLFNBQVM7OztJQUd6QixJQUFJLGFBQWEsSUFBSSxLQUFLLENBQUM7SUFDM0IsSUFBSTs7O01BR0YsYUFBYSxXQUFXLG9CQUFvQixDQUFDLFVBQVUsV0FBVyxrQkFBa0IsS0FBSyxXQUFXLGlCQUFpQjs7OztRQUluSCxXQUFXLGlCQUFpQixNQUFNLFdBQVcsbUJBQW1CLE1BQU0sV0FBVyxtQkFBbUIsS0FBSyxXQUFXLHdCQUF3QjtNQUM5SSxPQUFPLFdBQVc7Ozs7SUFJcEIsU0FBUyxJQUFJLE1BQU07TUFDakIsSUFBSSxJQUFJLFVBQVUsT0FBTzs7UUFFdkIsT0FBTyxJQUFJOztNQUViLElBQUk7TUFDSixJQUFJLFFBQVEseUJBQXlCOzs7UUFHbkMsY0FBYyxJQUFJLE1BQU07YUFDbkIsSUFBSSxRQUFRLFFBQVE7OztRQUd6QixjQUFjLElBQUkscUJBQXFCLElBQUk7YUFDdEM7UUFDTCxJQUFJLE9BQU8sYUFBYTs7UUFFeEIsSUFBSSxRQUFRLGtCQUFrQjtVQUM1QixJQUFJLFlBQVksUUFBUSxXQUFXLHFCQUFxQixPQUFPLGFBQWEsY0FBYztVQUMxRixJQUFJLG9CQUFvQjs7WUFFdEIsQ0FBQyxRQUFRLFlBQVk7Y0FDbkIsT0FBTztlQUNOLFNBQVM7WUFDWixJQUFJO2NBQ0Y7OztnQkFHRSxVQUFVLE9BQU87OztnQkFHakIsVUFBVSxJQUFJLGNBQWM7Z0JBQzVCLFVBQVUsSUFBSSxhQUFhOzs7OztnQkFLM0IsVUFBVSxjQUFjOzs7Z0JBR3hCLFVBQVUsV0FBVzs7O2dCQUdyQixnQkFBZ0I7Ozs7OztnQkFNaEIsVUFBVSxXQUFXO2dCQUNyQixVQUFVLENBQUMsV0FBVzs7O2dCQUd0QixVQUFVLENBQUMsV0FBVzs7Z0JBRXRCLFVBQVUsU0FBUzs7Ozs7Z0JBS25CLFVBQVUsQ0FBQyxPQUFPLFVBQVUsVUFBVTs7O2dCQUd0QyxVQUFVLEVBQUUsS0FBSyxDQUFDLE9BQU8sTUFBTSxPQUFPLE1BQU0sd0JBQXdCOztnQkFFcEUsVUFBVSxNQUFNLFdBQVc7Z0JBQzNCLFVBQVUsQ0FBQyxHQUFHLElBQUksTUFBTSxNQUFNOzs7Z0JBRzlCLFVBQVUsSUFBSSxLQUFLLENBQUMsYUFBYTs7Z0JBRWpDLFVBQVUsSUFBSSxLQUFLLGFBQWE7OztnQkFHaEMsVUFBVSxJQUFJLEtBQUssQ0FBQyxpQkFBaUI7OztnQkFHckMsVUFBVSxJQUFJLEtBQUssQ0FBQyxPQUFPO2NBQzdCLE9BQU8sV0FBVztjQUNsQixxQkFBcUI7OztVQUd6QixjQUFjOzs7UUFHaEIsSUFBSSxRQUFRLGNBQWM7VUFDeEIsSUFBSSxRQUFRLFFBQVE7VUFDcEIsSUFBSSxPQUFPLFNBQVMsWUFBWTtZQUM5QixJQUFJOzs7O2NBSUYsSUFBSSxNQUFNLFNBQVMsS0FBSyxDQUFDLE1BQU0sUUFBUTs7Z0JBRXJDLFFBQVEsTUFBTTtnQkFDZCxJQUFJLGlCQUFpQixNQUFNLEtBQUssVUFBVSxLQUFLLE1BQU0sS0FBSyxPQUFPO2dCQUNqRSxJQUFJLGdCQUFnQjtrQkFDbEIsSUFBSTs7b0JBRUYsaUJBQWlCLENBQUMsTUFBTTtvQkFDeEIsT0FBTyxXQUFXO2tCQUNwQixJQUFJLGdCQUFnQjtvQkFDbEIsSUFBSTs7OztzQkFJRixpQkFBaUIsTUFBTSxVQUFVO3NCQUNqQyxPQUFPLFdBQVc7O2tCQUV0QixJQUFJLGdCQUFnQjtvQkFDbEIsSUFBSTs7OztzQkFJRixpQkFBaUIsTUFBTSxVQUFVO3NCQUNqQyxPQUFPLFdBQVc7Ozs7Y0FJMUIsT0FBTyxXQUFXO2NBQ2xCLGlCQUFpQjs7O1VBR3JCLGNBQWM7OztNQUdsQixPQUFPLElBQUksUUFBUSxDQUFDLENBQUM7OztJQUd2QixJQUFJLE1BQU07O01BRVIsSUFBSSxnQkFBZ0I7VUFDaEIsWUFBWTtVQUNaLGNBQWM7VUFDZCxjQUFjO1VBQ2QsYUFBYTtVQUNiLGVBQWU7OztNQUduQixJQUFJLGlCQUFpQixJQUFJOzs7TUFHekIsSUFBSSxDQUFDLFlBQVk7UUFDZixJQUFJLFFBQVEsS0FBSzs7O1FBR2pCLElBQUksU0FBUyxDQUFDLEdBQUcsSUFBSSxJQUFJLElBQUksS0FBSyxLQUFLLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSzs7O1FBR2hFLElBQUksU0FBUyxVQUFVLE1BQU0sT0FBTztVQUNsQyxPQUFPLE9BQU8sU0FBUyxPQUFPLE9BQU8sUUFBUSxNQUFNLENBQUMsT0FBTyxRQUFRLFFBQVEsRUFBRSxRQUFRLE9BQU8sS0FBSyxNQUFNLENBQUMsT0FBTyxPQUFPLFNBQVMsT0FBTyxNQUFNLENBQUMsT0FBTyxPQUFPLFNBQVM7Ozs7OztNQU14SyxJQUFJLEVBQUUsYUFBYSxZQUFZLGlCQUFpQjtRQUM5QyxhQUFhLFVBQVUsVUFBVTtVQUMvQixJQUFJLFVBQVUsSUFBSTtVQUNsQixJQUFJLENBQUMsUUFBUSxZQUFZLE1BQU0sUUFBUSxZQUFZOzs7WUFHakQsWUFBWTthQUNYLFNBQVMsWUFBWSxVQUFVOzs7WUFHaEMsYUFBYSxVQUFVLFVBQVU7Ozs7Y0FJL0IsSUFBSSxXQUFXLEtBQUssV0FBVyxTQUFTLGFBQWEsS0FBSyxZQUFZLE1BQU07O2NBRTVFLEtBQUssWUFBWTtjQUNqQixPQUFPOztpQkFFSjs7WUFFTCxjQUFjLFFBQVE7OztZQUd0QixhQUFhLFVBQVUsVUFBVTtjQUMvQixJQUFJLFNBQVMsQ0FBQyxLQUFLLGVBQWUsYUFBYTtjQUMvQyxPQUFPLFlBQVksUUFBUSxFQUFFLFlBQVksVUFBVSxLQUFLLGNBQWMsT0FBTzs7O1VBR2pGLFVBQVU7VUFDVixPQUFPLFdBQVcsS0FBSyxNQUFNOzs7Ozs7TUFNakMsVUFBVSxVQUFVLFFBQVEsVUFBVTtRQUNwQyxJQUFJLE9BQU8sR0FBRyxZQUFZLFNBQVM7Ozs7O1FBS25DLENBQUMsYUFBYSxZQUFZO1VBQ3hCLEtBQUssVUFBVTtXQUNkLFVBQVUsVUFBVTs7O1FBR3ZCLFVBQVUsSUFBSTtRQUNkLEtBQUssWUFBWSxTQUFTOztVQUV4QixJQUFJLFdBQVcsS0FBSyxTQUFTLFdBQVc7WUFDdEM7OztRQUdKLGFBQWEsVUFBVTs7O1FBR3ZCLElBQUksQ0FBQyxNQUFNOztVQUVULFVBQVUsQ0FBQyxXQUFXLFlBQVksa0JBQWtCLHdCQUF3QixpQkFBaUIsa0JBQWtCOzs7VUFHL0csVUFBVSxVQUFVLFFBQVEsVUFBVTtZQUNwQyxJQUFJLGFBQWEsU0FBUyxLQUFLLFdBQVcsZUFBZSxVQUFVO1lBQ25FLElBQUksY0FBYyxDQUFDLGNBQWMsT0FBTyxPQUFPLGVBQWUsY0FBYyxZQUFZLE9BQU8sT0FBTyxtQkFBbUIsT0FBTyxrQkFBa0I7WUFDbEosS0FBSyxZQUFZLFFBQVE7OztjQUd2QixJQUFJLEVBQUUsY0FBYyxZQUFZLGdCQUFnQixZQUFZLEtBQUssUUFBUSxXQUFXO2dCQUNsRixTQUFTOzs7O1lBSWIsS0FBSyxTQUFTLFFBQVEsUUFBUSxXQUFXLFFBQVEsRUFBRSxTQUFTLFlBQVksS0FBSyxRQUFRLGFBQWEsU0FBUyxVQUFVOztlQUVsSCxJQUFJLFFBQVEsR0FBRzs7VUFFcEIsVUFBVSxVQUFVLFFBQVEsVUFBVTs7WUFFcEMsSUFBSSxVQUFVLElBQUksYUFBYSxTQUFTLEtBQUssV0FBVyxlQUFlO1lBQ3ZFLEtBQUssWUFBWSxRQUFROzs7O2NBSXZCLElBQUksRUFBRSxjQUFjLFlBQVksZ0JBQWdCLENBQUMsV0FBVyxLQUFLLFNBQVMsY0FBYyxRQUFRLFlBQVksTUFBTSxXQUFXLEtBQUssUUFBUSxXQUFXO2dCQUNuSixTQUFTOzs7O2VBSVY7O1VBRUwsVUFBVSxVQUFVLFFBQVEsVUFBVTtZQUNwQyxJQUFJLGFBQWEsU0FBUyxLQUFLLFdBQVcsZUFBZSxVQUFVO1lBQ25FLEtBQUssWUFBWSxRQUFRO2NBQ3ZCLElBQUksRUFBRSxjQUFjLFlBQVksZ0JBQWdCLFdBQVcsS0FBSyxRQUFRLGFBQWEsRUFBRSxnQkFBZ0IsYUFBYSxnQkFBZ0I7Z0JBQ2xJLFNBQVM7Ozs7O1lBS2IsSUFBSSxpQkFBaUIsV0FBVyxLQUFLLFNBQVMsV0FBVyxpQkFBaUI7Y0FDeEUsU0FBUzs7OztRQUlmLE9BQU8sUUFBUSxRQUFROzs7Ozs7Ozs7TUFTekIsSUFBSSxNQUFNOztRQUVSLElBQUksVUFBVTtVQUNaLElBQUk7VUFDSixJQUFJO1VBQ0osR0FBRztVQUNILElBQUk7VUFDSixJQUFJO1VBQ0osSUFBSTtVQUNKLEdBQUc7Ozs7O1FBS0wsSUFBSSxnQkFBZ0I7UUFDcEIsSUFBSSxpQkFBaUIsVUFBVSxPQUFPLE9BQU87OztVQUczQyxPQUFPLENBQUMsaUJBQWlCLFNBQVMsSUFBSSxNQUFNLENBQUM7Ozs7Ozs7UUFPL0MsSUFBSSxnQkFBZ0I7UUFDcEIsSUFBSSxRQUFRLFVBQVUsT0FBTztVQUMzQixJQUFJLFNBQVMsS0FBSyxRQUFRLEdBQUcsU0FBUyxNQUFNLFFBQVEsZUFBZSxDQUFDLGtCQUFrQixTQUFTO1VBQy9GLElBQUksVUFBVSxpQkFBaUIsaUJBQWlCLE1BQU0sTUFBTSxNQUFNO1VBQ2xFLE9BQU8sUUFBUSxRQUFRLFNBQVM7WUFDOUIsSUFBSSxXQUFXLE1BQU0sV0FBVzs7O1lBR2hDLFFBQVE7Y0FDTixLQUFLLEdBQUcsS0FBSyxHQUFHLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLO2dCQUN2RCxVQUFVLFFBQVE7Z0JBQ2xCO2NBQ0Y7Z0JBQ0UsSUFBSSxXQUFXLElBQUk7a0JBQ2pCLFVBQVUsZ0JBQWdCLGVBQWUsR0FBRyxTQUFTLFNBQVM7a0JBQzlEOztnQkFFRixVQUFVLGVBQWUsUUFBUSxTQUFTLE1BQU0sT0FBTzs7O1VBRzdELE9BQU8sU0FBUzs7Ozs7UUFLbEIsSUFBSSxZQUFZLFVBQVUsVUFBVSxRQUFRLFVBQVUsWUFBWSxZQUFZLGFBQWEsT0FBTyxlQUFlO1VBQy9HLElBQUksT0FBTyxXQUFXLE1BQU0sT0FBTyxNQUFNLE1BQU0sT0FBTyxTQUFTLFNBQVMsY0FBYyxTQUFTLFNBQVMsT0FBTyxRQUFRLFFBQVE7O1VBRS9ILGdCQUFnQixpQkFBaUI7O1VBRWpDLElBQUk7O1lBRUYsUUFBUSxPQUFPO1lBQ2YsT0FBTyxXQUFXO1VBQ3BCLElBQUksT0FBTyxTQUFTLFlBQVksT0FBTztZQUNyQyxZQUFZLFNBQVMsS0FBSztZQUMxQixJQUFJLGFBQWEsYUFBYSxDQUFDLFdBQVcsS0FBSyxPQUFPLFdBQVc7Y0FDL0QsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxHQUFHOzs7O2dCQUluQyxJQUFJLFFBQVE7Ozs7a0JBSVYsT0FBTyxNQUFNLFFBQVE7a0JBQ3JCLEtBQUssT0FBTyxNQUFNLE9BQU8sWUFBWSxPQUFPLEdBQUcsT0FBTyxPQUFPLEdBQUcsTUFBTSxNQUFNLE9BQU87a0JBQ25GLEtBQUssUUFBUSxNQUFNLENBQUMsT0FBTyxPQUFPLE1BQU0sTUFBTSxRQUFRLE9BQU8sTUFBTSxRQUFRLE1BQU0sTUFBTSxRQUFRO2tCQUMvRixPQUFPLElBQUksT0FBTyxPQUFPLE1BQU07Ozs7O2tCQUsvQixPQUFPLENBQUMsUUFBUSxRQUFRLFNBQVM7OztrQkFHakMsUUFBUSxNQUFNLE9BQU8sUUFBUTtrQkFDN0IsVUFBVSxNQUFNLE9BQU8sT0FBTztrQkFDOUIsVUFBVSxNQUFNLE9BQU8sT0FBTztrQkFDOUIsZUFBZSxPQUFPO3VCQUNqQjtrQkFDTCxPQUFPLE1BQU07a0JBQ2IsUUFBUSxNQUFNO2tCQUNkLE9BQU8sTUFBTTtrQkFDYixRQUFRLE1BQU07a0JBQ2QsVUFBVSxNQUFNO2tCQUNoQixVQUFVLE1BQU07a0JBQ2hCLGVBQWUsTUFBTTs7O2dCQUd2QixRQUFRLENBQUMsUUFBUSxLQUFLLFFBQVEsTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLE9BQU8sZUFBZSxHQUFHLE9BQU8sSUFBSSxDQUFDLE9BQU8sUUFBUSxlQUFlLEdBQUc7a0JBQzFILE1BQU0sZUFBZSxHQUFHLFFBQVEsS0FBSyxNQUFNLGVBQWUsR0FBRzs7O2tCQUc3RCxNQUFNLGVBQWUsR0FBRyxTQUFTLE1BQU0sZUFBZSxHQUFHLFdBQVcsTUFBTSxlQUFlLEdBQUc7O2tCQUU1RixNQUFNLGVBQWUsR0FBRyxnQkFBZ0I7cUJBQ3JDO2dCQUNMLFFBQVE7O21CQUVMLElBQUksT0FBTyxNQUFNLFVBQVUsZUFBZSxDQUFDLGFBQWEsZUFBZSxhQUFhLGVBQWUsYUFBYSxlQUFlLFdBQVcsS0FBSyxPQUFPLFlBQVk7Ozs7O2NBS3ZLLFFBQVEsTUFBTSxPQUFPOzs7VUFHekIsSUFBSSxVQUFVOzs7WUFHWixRQUFRLFNBQVMsS0FBSyxRQUFRLFVBQVU7O1VBRTFDLElBQUksVUFBVSxNQUFNO1lBQ2xCLE9BQU87O1VBRVQsWUFBWSxTQUFTLEtBQUs7VUFDMUIsSUFBSSxhQUFhLGNBQWM7O1lBRTdCLE9BQU8sS0FBSztpQkFDUCxJQUFJLGFBQWEsYUFBYTs7O1lBR25DLE9BQU8sUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxLQUFLLFFBQVE7aUJBQ2pELElBQUksYUFBYSxhQUFhOztZQUVuQyxPQUFPLE1BQU0sS0FBSzs7O1VBR3BCLElBQUksT0FBTyxTQUFTLFVBQVU7OztZQUc1QixLQUFLLFNBQVMsTUFBTSxRQUFRLFdBQVc7Y0FDckMsSUFBSSxNQUFNLFlBQVksT0FBTzs7Z0JBRTNCLE1BQU07Ozs7WUFJVixNQUFNLEtBQUs7WUFDWCxVQUFVOztZQUVWLFNBQVM7WUFDVCxlQUFlO1lBQ2YsSUFBSSxhQUFhLFlBQVk7Y0FDM0IsSUFBSSxjQUFjLFlBQVksUUFBUTs7Y0FFdEMsS0FBSyxRQUFRLEdBQUcsU0FBUyxNQUFNLFFBQVEsUUFBUSxRQUFRLFNBQVM7Z0JBQzlELFVBQVUsVUFBVSxPQUFPLE9BQU8sVUFBVSxZQUFZLFlBQVk7a0JBQ2xFLE9BQU87Z0JBQ1QsU0FBUyxZQUFZLFFBQVEsU0FBUztnQkFDdEMsZUFBZSxPQUFPLFVBQVUsUUFBUSxJQUFJLElBQUk7Z0JBQ2hELFFBQVEsS0FBSzs7Y0FFZixTQUFTLFFBQVE7O2tCQUViLGVBQWUsY0FBYztrQkFDN0IsUUFBUSxjQUFjLFFBQVEsS0FBSyxRQUFRLGVBQWUsT0FBTyxTQUFTO2tCQUMxRSxNQUFNLFFBQVEsS0FBSyxPQUFPOztrQkFFMUI7bUJBQ0M7Y0FDTCxJQUFJLGNBQWMsWUFBWSxRQUFRLE1BQU07Ozs7Y0FJNUMsUUFBUSxjQUFjLE9BQU8sVUFBVSxVQUFVO2dCQUMvQyxJQUFJLFFBQVEsVUFBVSxVQUFVLFVBQVUsT0FBTyxVQUFVLFlBQVksWUFBWTt3Q0FDM0QsT0FBTzs7Z0JBRS9CLElBQUksWUFBWSxPQUFPOzs7Ozs7O2tCQU9yQixTQUFTLE1BQU0sWUFBWSxPQUFPLGFBQWEsTUFBTSxNQUFNO2tCQUMzRCxlQUFlLE9BQU8sVUFBVSxVQUFVLElBQUksSUFBSTtrQkFDbEQsUUFBUSxLQUFLOzs7Y0FHakIsU0FBUyxRQUFROztrQkFFYixlQUFlLGNBQWM7a0JBQzdCLFFBQVEsY0FBYyxRQUFRLEtBQUssUUFBUSxlQUFlLE9BQU8sU0FBUztrQkFDMUUsTUFBTSxRQUFRLEtBQUssT0FBTzs7a0JBRTFCOzs7WUFHTixNQUFNO1lBQ04sT0FBTzs7Ozs7O1FBTVgsUUFBUSxZQUFZLFVBQVUsUUFBUSxRQUFRLE9BQU8sZUFBZTtVQUNsRSxJQUFJLFlBQVksVUFBVSxZQUFZO1VBQ3RDLElBQUksWUFBWSxPQUFPLFdBQVcsUUFBUTtZQUN4QyxJQUFJLENBQUMsWUFBWSxTQUFTLEtBQUssWUFBWSxlQUFlO2NBQ3hELFdBQVc7bUJBQ04sSUFBSSxhQUFhLFlBQVk7O2NBRWxDLGFBQWE7Y0FDYixLQUFLLElBQUksUUFBUSxHQUFHLFNBQVMsT0FBTyxRQUFRLE9BQU8sUUFBUSxRQUFRLFFBQVEsT0FBTyxVQUFVLENBQUMsQ0FBQyxZQUFZLFNBQVMsS0FBSyxTQUFTLGFBQWEsZUFBZSxhQUFhLGlCQUFpQixXQUFXLFNBQVMsR0FBRzs7O1VBR3ROLElBQUksT0FBTztZQUNULElBQUksQ0FBQyxZQUFZLFNBQVMsS0FBSyxXQUFXLGFBQWE7OztjQUdyRCxJQUFJLENBQUMsU0FBUyxRQUFRLEtBQUssR0FBRztnQkFDNUIsS0FBSyxhQUFhLElBQUksUUFBUSxPQUFPLFFBQVEsS0FBSyxXQUFXLFNBQVMsT0FBTyxjQUFjLElBQUk7O21CQUU1RixJQUFJLGFBQWEsYUFBYTtjQUNuQyxhQUFhLE1BQU0sVUFBVSxLQUFLLFFBQVEsTUFBTSxNQUFNLEdBQUc7Ozs7OztVQU03RCxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksTUFBTSxNQUFNLFFBQVEsUUFBUSxVQUFVLFlBQVksWUFBWSxJQUFJLElBQUk7OztRQUcxRyxRQUFRLG1CQUFtQixVQUFVLFFBQVEsUUFBUSxNQUFNO1VBQ3pELE9BQU8sUUFBUSxVQUFVLFFBQVEsUUFBUSxPQUFPOzs7OztNQUtwRCxJQUFJLENBQUMsSUFBSSxlQUFlO1FBQ3RCLElBQUksZUFBZSxPQUFPOzs7O1FBSTFCLElBQUksWUFBWTtVQUNkLElBQUk7VUFDSixJQUFJO1VBQ0osSUFBSTtVQUNKLElBQUk7VUFDSixLQUFLO1VBQ0wsS0FBSztVQUNMLEtBQUs7VUFDTCxLQUFLOzs7O1FBSVAsSUFBSSxPQUFPOzs7UUFHWCxJQUFJLFFBQVEsWUFBWTtVQUN0QixRQUFRLFNBQVM7VUFDakIsTUFBTTs7Ozs7O1FBTVIsSUFBSSxNQUFNLFlBQVk7VUFDcEIsSUFBSSxTQUFTLFFBQVEsU0FBUyxPQUFPLFFBQVEsT0FBTyxPQUFPLFVBQVUsVUFBVTtVQUMvRSxPQUFPLFFBQVEsUUFBUTtZQUNyQixXQUFXLE9BQU8sV0FBVztZQUM3QixRQUFRO2NBQ04sS0FBSyxHQUFHLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSzs7O2dCQUc3QjtnQkFDQTtjQUNGLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSzs7O2dCQUdsRCxRQUFRLGlCQUFpQixPQUFPLE9BQU8sU0FBUyxPQUFPO2dCQUN2RDtnQkFDQSxPQUFPO2NBQ1QsS0FBSzs7Ozs7Z0JBS0gsS0FBSyxRQUFRLEtBQUssU0FBUyxRQUFRLFNBQVM7a0JBQzFDLFdBQVcsT0FBTyxXQUFXO2tCQUM3QixJQUFJLFdBQVcsSUFBSTs7O29CQUdqQjt5QkFDSyxJQUFJLFlBQVksSUFBSTs7OztvQkFJekIsV0FBVyxPQUFPLFdBQVcsRUFBRTtvQkFDL0IsUUFBUTtzQkFDTixLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSyxLQUFLLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSzs7d0JBRXJFLFNBQVMsVUFBVTt3QkFDbkI7d0JBQ0E7c0JBQ0YsS0FBSzs7Ozt3QkFJSCxRQUFRLEVBQUU7d0JBQ1YsS0FBSyxXQUFXLFFBQVEsR0FBRyxRQUFRLFVBQVUsU0FBUzswQkFDcEQsV0FBVyxPQUFPLFdBQVc7OzswQkFHN0IsSUFBSSxFQUFFLFlBQVksTUFBTSxZQUFZLE1BQU0sWUFBWSxNQUFNLFlBQVksT0FBTyxZQUFZLE1BQU0sWUFBWSxLQUFLOzs0QkFFaEg7Ozs7d0JBSUosU0FBUyxhQUFhLE9BQU8sT0FBTyxNQUFNLE9BQU87d0JBQ2pEO3NCQUNGOzt3QkFFRTs7eUJBRUM7b0JBQ0wsSUFBSSxZQUFZLElBQUk7OztzQkFHbEI7O29CQUVGLFdBQVcsT0FBTyxXQUFXO29CQUM3QixRQUFROztvQkFFUixPQUFPLFlBQVksTUFBTSxZQUFZLE1BQU0sWUFBWSxJQUFJO3NCQUN6RCxXQUFXLE9BQU8sV0FBVyxFQUFFOzs7b0JBR2pDLFNBQVMsT0FBTyxNQUFNLE9BQU87OztnQkFHakMsSUFBSSxPQUFPLFdBQVcsVUFBVSxJQUFJOztrQkFFbEM7a0JBQ0EsT0FBTzs7O2dCQUdUO2NBQ0Y7O2dCQUVFLFFBQVE7O2dCQUVSLElBQUksWUFBWSxJQUFJO2tCQUNsQixXQUFXO2tCQUNYLFdBQVcsT0FBTyxXQUFXLEVBQUU7OztnQkFHakMsSUFBSSxZQUFZLE1BQU0sWUFBWSxJQUFJOztrQkFFcEMsSUFBSSxZQUFZLE9BQU8sQ0FBQyxXQUFXLE9BQU8sV0FBVyxRQUFRLEtBQUssWUFBWSxNQUFNLFlBQVksS0FBSzs7b0JBRW5HOztrQkFFRixXQUFXOztrQkFFWCxPQUFPLFFBQVEsV0FBVyxDQUFDLFdBQVcsT0FBTyxXQUFXLFNBQVMsWUFBWSxNQUFNLFlBQVksS0FBSyxRQUFROzs7a0JBRzVHLElBQUksT0FBTyxXQUFXLFVBQVUsSUFBSTtvQkFDbEMsV0FBVyxFQUFFOztvQkFFYixPQUFPLFdBQVcsV0FBVyxDQUFDLFdBQVcsT0FBTyxXQUFXLFlBQVksWUFBWSxNQUFNLFlBQVksS0FBSyxXQUFXO29CQUNySCxJQUFJLFlBQVksT0FBTzs7c0JBRXJCOztvQkFFRixRQUFROzs7O2tCQUlWLFdBQVcsT0FBTyxXQUFXO2tCQUM3QixJQUFJLFlBQVksT0FBTyxZQUFZLElBQUk7b0JBQ3JDLFdBQVcsT0FBTyxXQUFXLEVBQUU7OztvQkFHL0IsSUFBSSxZQUFZLE1BQU0sWUFBWSxJQUFJO3NCQUNwQzs7O29CQUdGLEtBQUssV0FBVyxPQUFPLFdBQVcsV0FBVyxDQUFDLFdBQVcsT0FBTyxXQUFXLFlBQVksWUFBWSxNQUFNLFlBQVksS0FBSyxXQUFXO29CQUNySSxJQUFJLFlBQVksT0FBTzs7c0JBRXJCOztvQkFFRixRQUFROzs7a0JBR1YsT0FBTyxDQUFDLE9BQU8sTUFBTSxPQUFPOzs7Z0JBRzlCLElBQUksVUFBVTtrQkFDWjs7O2dCQUdGLElBQUksT0FBTyxNQUFNLE9BQU8sUUFBUSxNQUFNLFFBQVE7a0JBQzVDLFNBQVM7a0JBQ1QsT0FBTzt1QkFDRixJQUFJLE9BQU8sTUFBTSxPQUFPLFFBQVEsTUFBTSxTQUFTO2tCQUNwRCxTQUFTO2tCQUNULE9BQU87dUJBQ0YsSUFBSSxPQUFPLE1BQU0sT0FBTyxRQUFRLE1BQU0sUUFBUTtrQkFDbkQsU0FBUztrQkFDVCxPQUFPOzs7Z0JBR1Q7Ozs7O1VBS04sT0FBTzs7OztRQUlULElBQUksTUFBTSxVQUFVLE9BQU87VUFDekIsSUFBSSxTQUFTO1VBQ2IsSUFBSSxTQUFTLEtBQUs7O1lBRWhCOztVQUVGLElBQUksT0FBTyxTQUFTLFVBQVU7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixNQUFNLE9BQU8sS0FBSyxNQUFNLE9BQU8sS0FBSzs7Y0FFeEQsT0FBTyxNQUFNLE1BQU07OztZQUdyQixJQUFJLFNBQVMsS0FBSzs7Y0FFaEIsVUFBVTtjQUNWLFFBQVEsZUFBZSxhQUFhLE9BQU87Z0JBQ3pDLFFBQVE7O2dCQUVSLElBQUksU0FBUyxLQUFLO2tCQUNoQjs7Ozs7Z0JBS0YsSUFBSSxZQUFZO2tCQUNkLElBQUksU0FBUyxLQUFLO29CQUNoQixRQUFRO29CQUNSLElBQUksU0FBUyxLQUFLOztzQkFFaEI7O3lCQUVHOztvQkFFTDs7OztnQkFJSixJQUFJLFNBQVMsS0FBSztrQkFDaEI7O2dCQUVGLFFBQVEsS0FBSyxJQUFJOztjQUVuQixPQUFPO21CQUNGLElBQUksU0FBUyxLQUFLOztjQUV2QixVQUFVO2NBQ1YsUUFBUSxlQUFlLGFBQWEsT0FBTztnQkFDekMsUUFBUTs7Z0JBRVIsSUFBSSxTQUFTLEtBQUs7a0JBQ2hCOzs7O2dCQUlGLElBQUksWUFBWTtrQkFDZCxJQUFJLFNBQVMsS0FBSztvQkFDaEIsUUFBUTtvQkFDUixJQUFJLFNBQVMsS0FBSzs7c0JBRWhCOzt5QkFFRzs7b0JBRUw7Ozs7OztnQkFNSixJQUFJLFNBQVMsT0FBTyxPQUFPLFNBQVMsWUFBWSxDQUFDLGlCQUFpQixNQUFNLE9BQU8sS0FBSyxNQUFNLE9BQU8sT0FBTyxTQUFTLEtBQUs7a0JBQ3BIOztnQkFFRixRQUFRLE1BQU0sTUFBTSxNQUFNLElBQUk7O2NBRWhDLE9BQU87OztZQUdUOztVQUVGLE9BQU87Ozs7UUFJVCxJQUFJLFNBQVMsVUFBVSxRQUFRLFVBQVUsVUFBVTtVQUNqRCxJQUFJLFVBQVUsS0FBSyxRQUFRLFVBQVU7VUFDckMsSUFBSSxZQUFZLE9BQU87WUFDckIsT0FBTyxPQUFPO2lCQUNUO1lBQ0wsT0FBTyxZQUFZOzs7Ozs7O1FBT3ZCLElBQUksT0FBTyxVQUFVLFFBQVEsVUFBVSxVQUFVO1VBQy9DLElBQUksUUFBUSxPQUFPLFdBQVc7VUFDOUIsSUFBSSxPQUFPLFNBQVMsWUFBWSxPQUFPOzs7O1lBSXJDLElBQUksU0FBUyxLQUFLLFVBQVUsWUFBWTtjQUN0QyxLQUFLLFNBQVMsTUFBTSxRQUFRLFdBQVc7Z0JBQ3JDLE9BQU8sT0FBTyxRQUFROzttQkFFbkI7Y0FDTCxRQUFRLE9BQU8sVUFBVSxVQUFVO2dCQUNqQyxPQUFPLE9BQU8sVUFBVTs7OztVQUk5QixPQUFPLFNBQVMsS0FBSyxRQUFRLFVBQVU7Ozs7UUFJekMsUUFBUSxRQUFRLFVBQVUsUUFBUSxVQUFVO1VBQzFDLElBQUksUUFBUTtVQUNaLFFBQVE7VUFDUixTQUFTLEtBQUs7VUFDZCxTQUFTLElBQUk7O1VBRWIsSUFBSSxTQUFTLEtBQUs7WUFDaEI7OztVQUdGLFFBQVEsU0FBUztVQUNqQixPQUFPLFlBQVksU0FBUyxLQUFLLGFBQWEsZ0JBQWdCLE1BQU0sUUFBUSxJQUFJLE1BQU0sTUFBTSxRQUFRLFFBQVEsSUFBSSxZQUFZOzs7OztJQUtsSSxRQUFRLGtCQUFrQjtJQUMxQixPQUFPOzs7RUFHVCxJQUFJLGVBQWUsQ0FBQyxVQUFVOztJQUU1QixhQUFhLE1BQU07U0FDZDs7SUFFTCxJQUFJLGFBQWEsS0FBSztRQUNsQixlQUFlLEtBQUs7UUFDcEIsYUFBYTs7SUFFakIsSUFBSSxRQUFRLGFBQWEsT0FBTyxLQUFLLFdBQVc7OztNQUc5QyxjQUFjLFlBQVk7UUFDeEIsSUFBSSxDQUFDLFlBQVk7VUFDZixhQUFhO1VBQ2IsS0FBSyxPQUFPO1VBQ1osS0FBSyxXQUFXO1VBQ2hCLGFBQWEsZUFBZTs7UUFFOUIsT0FBTzs7OztJQUlYLEtBQUssT0FBTztNQUNWLFNBQVMsTUFBTTtNQUNmLGFBQWEsTUFBTTs7Ozs7RUFLdkIsSUFBSSxVQUFVO0lBQ1osT0FBTyxZQUFZO01BQ2pCLE9BQU87OztHQUdWLEtBQUs7QUFDUjs7O0FDdjZCQTs7Ozs7Ozs7QUFRQSxRQUFRLE9BQU87R0FDWixVQUFVLE9BQU8sV0FBVztJQUMzQixPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixTQUFTO01BQ1QsU0FBUztNQUNULFlBQVk7TUFDWixPQUFPO1FBQ0wsU0FBUzs7TUFFWCxNQUFNLFNBQVMsT0FBTyxTQUFTLE9BQU8sa0JBQWtCO1FBQ3RELGlCQUFpQixPQUFPOzs7O0FBSWhDOzs7QUN4QkE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSxVQUFVLFdBQVc7SUFDOUIsT0FBTztNQUNMLGFBQWE7TUFDYixVQUFVO01BQ1YsWUFBWTs7O01BR1osWUFBWSxXQUFXO1FBQ3JCLElBQUksT0FBTzs7UUFFWCxLQUFLLE9BQU87O1FBRVosS0FBSyxTQUFTLFNBQVMsVUFBVTs7VUFFL0IsU0FBUyxTQUFTLEtBQUssS0FBSyxXQUFXO1VBQ3ZDLEtBQUssS0FBSyxLQUFLOzs7UUFHakIsS0FBSyxVQUFVLFNBQVMsYUFBYTtVQUNuQyxLQUFLLEtBQUssUUFBUSxTQUFTLEtBQUs7O1lBRTlCLElBQUksU0FBUyxRQUFROzs7Ozs7TUFNM0IsY0FBYzs7O0FBR3BCOzs7QUN2Q0E7O0FBRUEsUUFBUSxPQUFPO0dBQ1osVUFBVSw0R0FBVSxTQUFTLElBQUksSUFBSSxVQUFVLElBQUksU0FBUyxRQUFRLFFBQVEsR0FBRyxXQUFXLFFBQVEsTUFBTTtJQUN2RyxJQUFJLFVBQVU7SUFDZCxJQUFJLGtCQUFrQixNQUFNLEdBQUcsa0JBQWtCLFVBQVU7O0lBRTNELElBQUksY0FBYyxJQUFJLEtBQUssU0FBUyxHQUFHLEVBQUU7UUFDckMsT0FBTyxFQUFFLFdBQVcsRUFBRTs7TUFFeEIsWUFBWTs7SUFFZCxTQUFTLFlBQVksT0FBTyxRQUFROztNQUVsQyxJQUFJLFFBQVEsbUJBQW1CLFNBQVMsbUJBQW1CLE1BQU0sU0FBUyxpQkFBaUI7UUFDekYsT0FBTzs7TUFFVCxPQUFPOzs7SUFHVCxPQUFPO01BQ0wsYUFBYTtNQUNiLFVBQVU7TUFDVixPQUFPO1FBQ0wsT0FBTzs7O1FBR1AsVUFBVTtRQUNWLFVBQVU7O1FBRVYsa0JBQWtCO1FBQ2xCLFdBQVc7UUFDWCxVQUFVO1FBQ1YsVUFBVTtRQUNWLFVBQVU7UUFDVixVQUFVO1FBQ1YsU0FBUztRQUNULFdBQVc7UUFDWCxTQUFTOztNQUVYLFNBQVM7TUFDVCxNQUFNLFNBQVMsT0FBTyxTQUFTO1FBQzdCLElBQUksZ0JBQWdCO1VBQ2xCLGtCQUFrQjs7UUFFcEIsTUFBTSxTQUFTO1FBQ2YsTUFBTSxlQUFlO1FBQ3JCLE1BQU0saUJBQWlCO1FBQ3ZCLE1BQU0sYUFBYTtRQUNuQixNQUFNLGdCQUFnQjtRQUN0QixNQUFNLFlBQVk7UUFDbEIsSUFBSSxTQUFTLEdBQUcsT0FBTzs7UUFFdkIsTUFBTSxZQUFZLFdBQVc7VUFDM0IsTUFBTSxlQUFlLFNBQVMsVUFBVTtZQUN0QyxPQUFPLGVBQWUsT0FBTyxRQUFRLGlCQUFpQixJQUFJLE1BQU0sTUFBTTtZQUN0RSxNQUFNLGFBQWEsQ0FBQyxNQUFNO2FBQ3pCOzs7UUFHTCxNQUFNLFdBQVcsV0FBVztVQUMxQixJQUFJLE1BQU0sWUFBWTtZQUNwQixPQUFPLGVBQWUsT0FBTyxRQUFRLGdCQUFnQixJQUFJLE1BQU0sTUFBTTs7O1VBR3ZFLFNBQVMsT0FBTyxNQUFNO1VBQ3RCLE1BQU0sYUFBYSxNQUFNLFdBQVc7OztRQUd0QyxTQUFTLGdCQUFnQixPQUFPLE1BQU07VUFDcEMsSUFBSSxDQUFDLEtBQUssTUFBTSxNQUFNLEVBQUU7O1VBRXhCLE1BQU0saUJBQWlCLFNBQVMsU0FBUyxpQkFBaUI7WUFDeEQsTUFBTSxnQkFBZ0I7WUFDdEIsT0FBTyxlQUFlLE9BQU8sUUFBUSxlQUFlLEtBQUs7Ozs7WUFJekQsTUFBTSxPQUFPLEVBQUUsTUFBTSxLQUFLLE1BQU0sTUFBTSxJQUFJLFNBQVMsR0FBRztjQUNwRCxFQUFFLEtBQUssR0FBRyxTQUFTLEVBQUUsTUFBTSxPQUFPLEVBQUUsTUFBTSxFQUFFO2NBQzVDLE9BQU87O1lBRVQsTUFBTTs7WUFFTixJQUFJLFVBQVUsUUFBUSxLQUFLO2NBQ3pCLFFBQVEsUUFBUSxRQUFRO2NBQ3hCLFFBQVEsUUFBUTtjQUNoQixRQUFRLFFBQVE7OztZQUdsQixJQUFJLE1BQU0sTUFBTSxHQUFHLFNBQVMsTUFBTSxVQUFVO2NBQzFDLFFBQVEsSUFBSSxRQUFRLE1BQU0sTUFBTTttQkFDM0I7Y0FDTCxRQUFRLElBQUksUUFBUSxNQUFNLE1BQU0sR0FBRzs7OztZQUlyQyxJQUFJLE1BQU0sTUFBTSxJQUFJLFFBQVEsTUFBTSxTQUFTO2NBQ3pDLFFBQVEsSUFBSSxTQUFTLE1BQU0sTUFBTTttQkFDNUI7Y0FDTCxRQUFRLElBQUksU0FBUyxNQUFNLE1BQU0sR0FBRzs7YUFFckM7OztRQUdMLFNBQVMsZUFBZSxPQUFPLE1BQU07O1VBRW5DLElBQUksVUFBVSxRQUFRLEtBQUs7VUFDM0IsUUFBUSxJQUFJLE9BQU87VUFDbkIsUUFBUSxJQUFJLFFBQVE7VUFDcEIsU0FBUyxPQUFPLE1BQU07VUFDdEIsSUFBSSxNQUFNLGVBQWU7WUFDdkIsT0FBTyxlQUFlLE9BQU8sUUFBUSxtQkFBbUIsS0FBSzs7VUFFL0QsTUFBTSxnQkFBZ0I7VUFDdEIsTUFBTSxPQUFPO1VBQ2IsTUFBTTs7O1FBR1IsU0FBUyxZQUFZO1VBQ25CLElBQUksWUFBWSxNQUFNLGFBQWEsT0FBTyxvQkFBb0I7O1VBRTlELElBQUksQ0FBQyxNQUFNLE1BQU0sUUFBUTs7VUFFekIsSUFBSSxTQUFTLEVBQUUsVUFBVSxNQUFNLE1BQU07VUFDckMsR0FBRyxPQUFPLE9BQU8sUUFBUSxPQUFPOzs7VUFHaEMsSUFBSSxRQUFRLE1BQU0sTUFBTSxTQUFTLFFBQVE7O1VBRXpDLE9BQU8sR0FBRyxRQUFRLFFBQVE7OztRQUc1QixTQUFTLGtCQUFrQjtVQUN6QixJQUFJLE1BQU0sU0FBUztZQUNqQixJQUFJLFNBQVMsTUFBTSxXQUFXLEtBQUssTUFBTSxXQUFXLE1BQU0sUUFBUTtZQUNsRSxJQUFJLFNBQVMsTUFBTSxZQUFZLElBQUksTUFBTSxZQUFZLE1BQU0sVUFBVTtZQUNyRSxJQUFJLFFBQVEsS0FBSyxJQUFJLFFBQVE7O1lBRTdCLElBQUksWUFBWTtZQUNoQixPQUFPLE9BQU8sV0FBVyxPQUFPO2NBQzlCLGFBQWE7OztZQUdmLElBQUksSUFBSSxZQUFZLE1BQU0sS0FBSztZQUMvQixRQUFRLEtBQUssU0FBUyxJQUFJLGFBQWEsY0FBYyxFQUFFLE9BQU8sRUFBRSxZQUFZLFVBQVU7aUJBQ2pGO1lBQ0wsUUFBUSxLQUFLLFNBQVMsSUFBSSxhQUFhOzs7O1FBSTNDLFNBQVMsa0JBQWtCOztVQUV6QixJQUFJLFlBQVksU0FBUyxHQUFHO1lBQzFCLElBQUksT0FBTyxZQUFZO1lBQ3ZCLEtBQUs7aUJBQ0E7O1lBRUwsWUFBWTs7OztRQUloQixTQUFTLE9BQU8sTUFBTTtVQUNwQixJQUFJLENBQUMsTUFBTTtZQUNULElBQUksTUFBTTtjQUNSLEtBQUssSUFBSTtjQUNULEtBQUssSUFBSTs7WUFFWDs7O1VBR0YsTUFBTSxTQUFTLEtBQUs7VUFDcEIsSUFBSSxDQUFDLFNBQVM7WUFDWixRQUFRLE1BQU07OztVQUdoQixJQUFJLFlBQVksTUFBTSxNQUFNLGNBQWMsTUFBTSxNQUFNLFNBQVMsR0FBRyxTQUFTLFVBQVUsTUFBTSxNQUFNLFVBQVU7O1VBRTNHLE1BQU0sV0FBVyxZQUFZOztVQUU3QixTQUFTLFlBQVk7O1lBRW5CLElBQUksTUFBTSxhQUFhLE1BQU0sYUFBYSxNQUFNLFlBQVksTUFBTSxNQUFNLGVBQWUsQ0FBQyxNQUFNLFNBQVMsTUFBTSxNQUFNLGVBQWU7Y0FDaEksUUFBUSxJQUFJLG9CQUFvQjtjQUNoQztjQUNBOzs7WUFHRixJQUFJLFFBQVEsSUFBSSxPQUFPOztZQUV2QixHQUFHLE1BQU0sS0FBSyxNQUFNLFNBQVMsT0FBTztjQUNsQyxJQUFJO2dCQUNGLElBQUksV0FBVyxJQUFJLE9BQU87Z0JBQzFCLE9BQU87Z0JBQ1AsT0FBTyxNQUFNLENBQUMsSUFBSSxRQUFROztnQkFFMUIsSUFBSSxDQUFDLE9BQU8sUUFBUTtrQkFDbEIsS0FBSyxLQUFLLENBQUMsS0FBSyxRQUFROzs7Z0JBRzFCLE1BQU0sU0FBUyxLQUFLO2dCQUNwQixNQUFNLFNBQVMsS0FBSztnQkFDcEIsS0FBSyxTQUFTLFlBQVksS0FBSyxPQUFPLE1BQU07Z0JBQzVDLEtBQUs7O2dCQUVMLE9BQU8sZUFBZSxPQUFPLFFBQVEsY0FBYyxJQUFJLE1BQU0sTUFBTTtrQkFDakU7O2dCQUVGLElBQUksV0FBVyxJQUFJLE9BQU87Z0JBQzFCLFFBQVEsSUFBSSxlQUFlLFNBQVMsUUFBUSxhQUFhLFNBQVMsV0FBVztnQkFDN0UsSUFBSSxNQUFNLFNBQVM7a0JBQ2pCLEtBQUssR0FBRyxhQUFhO2tCQUNyQixLQUFLLEdBQUcsWUFBWTs7Z0JBRXRCLE9BQU8sR0FBRztnQkFDVixRQUFRLE1BQU07d0JBQ047Z0JBQ1I7Ozs7OztVQU1OLElBQUksQ0FBQyxXQUFXO1lBQ2QsVUFBVTtZQUNWO2lCQUNLOztZQUVMLFlBQVksS0FBSztjQUNmLFVBQVUsTUFBTSxZQUFZO2NBQzVCLE9BQU87Ozs7O1FBS2IsSUFBSTtRQUNKLE1BQU0sT0FBTyxnQkFBZ0IsV0FBVztVQUN0QyxJQUFJLE9BQU8sTUFBTSxNQUFNLFNBQVM7VUFDaEMsSUFBSSxDQUFDLE1BQU0sTUFBTSxXQUFXO1lBQzFCLE1BQU0sTUFBTSxZQUFZLEdBQUcsU0FBUyxTQUFTLE1BQU0sTUFBTSxRQUFRLE9BQU87O1VBRTFFLE9BQU87V0FDTjs7UUFFSCxNQUFNLElBQUksWUFBWSxXQUFXO1VBQy9CLFFBQVEsSUFBSTtVQUNaLElBQUksTUFBTTtZQUNSLEtBQUssSUFBSTtZQUNULEtBQUssSUFBSTtZQUNULE9BQU87OztVQUdULE1BQU0sWUFBWTs7Ozs7Ozs7O0FBUzVCOzs7QUNyUUE7Ozs7Ozs7O0FBUUEsUUFBUSxPQUFPO0dBQ1osVUFBVSwwRUFBZSxVQUFVLFdBQVcsUUFBUSxJQUFJLFNBQVMsTUFBTSxRQUFRO0lBQ2hGLE9BQU87TUFDTCxhQUFhO01BQ2IsVUFBVTtNQUNWLFNBQVM7TUFDVCxPQUFPOztRQUVMLE9BQU87OztRQUdQLFVBQVU7UUFDVixVQUFVOztRQUVWLGtCQUFrQjtRQUNsQixXQUFXO1FBQ1gsV0FBVztRQUNYLFVBQVU7UUFDVixVQUFVO1FBQ1YsVUFBVTtRQUNWLFNBQVM7UUFDVCxXQUFXO1FBQ1gsU0FBUzs7OztRQUlULFVBQVU7O1FBRVYsY0FBYztRQUNkLFdBQVc7UUFDWCxZQUFZO1FBQ1osZ0JBQWdCO1FBQ2hCLFdBQVc7UUFDWCxTQUFTO1FBQ1QsY0FBYztRQUNkLFVBQVU7UUFDVixlQUFlOztRQUVmLGdCQUFnQjtRQUNoQixZQUFZO1FBQ1osYUFBYTtRQUNiLGNBQWM7O01BRWhCLE1BQU0sU0FBUyxTQUFTLE9BQU8sU0FBUztRQUN0QyxNQUFNLFlBQVk7UUFDbEIsTUFBTSxTQUFTO1FBQ2YsTUFBTSxVQUFVOztRQUVoQixNQUFNLFVBQVUsU0FBUyxNQUFNLE9BQU87VUFDcEMsUUFBUSxJQUFJLEtBQUssU0FBUyxLQUFLLFVBQVU7Ozs7O1FBSzNDLE1BQU0sTUFBTTtRQUNaLE1BQU0sSUFBSSxVQUFVLFNBQVMsTUFBTSxTQUFTO1VBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTztVQUNwQixJQUFJLFdBQVcsS0FBSztZQUNsQixRQUFRLFNBQVM7O1VBRW5CLE9BQU8sU0FBUyxNQUFNLFFBQVEsT0FBTyxDQUFDLE1BQU07OztRQUc5QyxNQUFNLElBQUksU0FBUyxTQUFTLE1BQU0sU0FBUztVQUN6QyxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsTUFBTSxVQUFVLEVBQUU7O1VBRXpDLElBQUksUUFBUSxLQUFLLFNBQVM7WUFDeEIsUUFBUSxNQUFNLFFBQVEsTUFBTSxTQUFTOztVQUV2QyxNQUFNLE9BQU8sTUFBTSxTQUFTLFFBQVEsV0FBVztVQUMvQyxPQUFPLGVBQWUsT0FBTyxRQUFRLFlBQVksTUFBTSxNQUFNOztRQUUvRCxNQUFNLElBQUksU0FBUyxTQUFTLE1BQU0sU0FBUztVQUN6QyxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsTUFBTSxVQUFVLEVBQUU7O1VBRXpDLElBQUksUUFBUSxLQUFLLFNBQVM7WUFDeEIsUUFBUSxNQUFNLFFBQVEsTUFBTSxTQUFTOztVQUV2QyxPQUFPLE1BQU0sU0FBUzs7Ozs7UUFLeEIsSUFBSSxhQUFhLE1BQU0sYUFBYSxTQUFTLE1BQU07VUFDakQsT0FBTyxlQUFlLE9BQU8sUUFBUSxhQUFhLE1BQU0sTUFBTTtVQUM5RCxHQUFHLFNBQVMsV0FBVzs7O1FBR3pCLFdBQVcsVUFBVSxHQUFHLFNBQVMsV0FBVzs7OztRQUk1QyxNQUFNLG1CQUFtQixTQUFTLE1BQU0sT0FBTztVQUM3QyxPQUFPLGVBQWUsT0FBTyxRQUFRLG9CQUFvQixNQUFNLE1BQU07O1VBRXJFLEdBQUcsU0FBUyxrQkFBa0IsTUFBTTs7UUFFdEMsTUFBTSxpQkFBaUIsVUFBVSxHQUFHLFNBQVMsa0JBQWtCOztRQUUvRCxJQUFJLGFBQWEsSUFBSSxLQUFLO1VBQ3hCLFNBQVMsUUFBUSxLQUFLLGFBQWE7VUFDbkMsUUFBUSxRQUFRLEtBQUssY0FBYztVQUNuQyxVQUFVO1VBQ1YsUUFBUTtVQUNSLG1CQUFtQjs7O1FBR3JCLE1BQU0sa0JBQWtCLFNBQVMsUUFBUTtVQUN2QyxJQUFJLFlBQVksVUFBVSxHQUFHLFNBQVMsV0FBVyxVQUFVO1lBQ3pELE9BQU8sVUFBVSxHQUFHLFNBQVMsV0FBVyxLQUFLOztVQUUvQyxJQUFJLGNBQWMsS0FBSztZQUNyQixPQUFPLFNBQVMsTUFBTTtjQUNwQjtpQkFDRyxJQUFJLGNBQWMsS0FBSztZQUM1QixPQUFPLFNBQVMsTUFBTTtjQUNwQjtpQkFDRztZQUNMLE9BQU87Ozs7UUFJWCxNQUFNLFlBQVksV0FBVztVQUMzQixPQUFPLGVBQWUsT0FBTyxRQUFRLGtCQUFrQixNQUFNLE1BQU07VUFDbkUsR0FBRyxTQUFTLFVBQVUsTUFBTSxNQUFNOzs7UUFHcEMsTUFBTSxJQUFJLFlBQVksV0FBVztVQUMvQixNQUFNLFFBQVE7VUFDZCxXQUFXOzs7OztBQUtyQjs7O0FDOUlBOztBQUVBLFFBQVEsT0FBTztHQUNaLE9BQU8sZUFBZSxXQUFXO0lBQ2hDLE9BQU8sU0FBUyxPQUFPO01BQ3JCLE9BQU8sS0FBSyxVQUFVLE9BQU8sTUFBTSxNQUFNOzs7QUFHL0M7OztBQ1JBOzs7Ozs7Ozs7O0FBVUEsUUFBUSxPQUFPO0dBQ1osT0FBTyxhQUFhLFlBQVk7SUFDL0IsT0FBTyxVQUFVLE9BQU87TUFDdEIsT0FBTyxPQUFPLFVBQVU7O0tBRXpCOzs7O0FDZkw7O0FBRUEsUUFBUSxPQUFPO0dBQ1osT0FBTyxhQUFhLFdBQVc7SUFDOUIsT0FBTyxTQUFTLE9BQU87TUFDckIsSUFBSSxhQUFhO1FBQ2YsR0FBRztRQUNILEdBQUc7UUFDSCxHQUFHO1FBQ0gsR0FBRzs7O01BR0wsT0FBTyxXQUFXOzs7QUFHeEI7OztBQ2ZBOzs7Ozs7Ozs7O0FBVUEsUUFBUSxPQUFPO0dBQ1osT0FBTyxrREFBYSxVQUFVLG1CQUFtQixHQUFHLFFBQVE7SUFDM0QsU0FBUyxjQUFjLFFBQVE7TUFDN0IsSUFBSSxNQUFNOztNQUVWLElBQUksT0FBTyxRQUFRO1FBQ2pCLElBQUksUUFBUSxVQUFVLGtCQUFrQixFQUFFLE9BQU8sT0FBTztRQUN4RCxPQUFPLHNCQUFzQixRQUFROzs7TUFHdkMsSUFBSSxPQUFPLFVBQVU7UUFDbkIsSUFBSSxXQUFXLEVBQUUsS0FBSyxPQUFPLFVBQVU7UUFDdkMsV0FBVyxVQUFVLGtCQUFrQjtRQUN2QyxPQUFPLHNCQUFzQixXQUFXOzs7TUFHMUMsSUFBSSxPQUFPLFdBQVc7UUFDcEIsSUFBSSxZQUFZLEVBQUUsS0FBSyxPQUFPLFdBQVc7UUFDekMsWUFBWSxVQUFVLGtCQUFrQjtRQUN4QyxPQUFPLHFCQUFxQixZQUFZOzs7TUFHMUMsSUFBSSxXQUFXO01BQ2YsUUFBUSxPQUFPO1FBQ2IsS0FBSztVQUNILE9BQU8sV0FBVztVQUNsQjtRQUNGLEtBQUs7VUFDSCxPQUFPLFdBQVc7VUFDbEI7UUFDRixLQUFLO1VBQ0gsT0FBTyxXQUFXO1VBQ2xCOzs7TUFHSixPQUFPOzs7SUFHVCxTQUFTLFdBQVcsUUFBUTtNQUMxQixJQUFJLE1BQU07TUFDVixJQUFJLE9BQU8sVUFBVTtRQUNuQixJQUFJLFdBQVcsRUFBRSxLQUFLLE9BQU8sVUFBVTtRQUN2QyxXQUFXLFVBQVUsa0JBQWtCO1FBQ3ZDLE9BQU8sc0JBQXNCLFdBQVc7O01BRTFDLE9BQU87OztJQUdULE9BQU8sT0FBTyxVQUFVLFlBQVksZ0JBQWdCO01BQ25EOzs7O0FDM0RMOzs7Ozs7Ozs7O0FBVUEsUUFBUSxPQUFPO0dBQ1osT0FBTyxvQkFBb0IsWUFBWTtJQUN0QyxPQUFPLFVBQVUsT0FBTztNQUN0QixPQUFPLFFBQVEsTUFBTSxRQUFRLE9BQU8sT0FBTzs7S0FFNUMiLCJmaWxlIjoidmx1aS5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcbi8qIGdsb2JhbHMgd2luZG93LCBhbmd1bGFyICovXG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJywgW1xuICAnTG9jYWxTdG9yYWdlTW9kdWxlJyxcbiAgJ3VpLnNlbGVjdCcsXG4gICdhbmd1bGFyLWdvb2dsZS1hbmFseXRpY3MnXG4gIF0pXG4gIC5jb25zdGFudCgnXycsIHdpbmRvdy5fKVxuICAvLyBkYXRhbGliLCB2ZWdhbGl0ZSwgdmVnYVxuICAuY29uc3RhbnQoJ2RsJywgd2luZG93LmRsKVxuICAuY29uc3RhbnQoJ3ZsJywgd2luZG93LnZsKVxuICAuY29uc3RhbnQoJ3ZnJywgd2luZG93LnZnKVxuICAvLyBvdGhlciBsaWJyYXJpZXNcbiAgLmNvbnN0YW50KCdCbG9iJywgd2luZG93LkJsb2IpXG4gIC5jb25zdGFudCgnVVJMJywgd2luZG93LlVSTClcbiAgLmNvbnN0YW50KCdEcm9wJywgd2luZG93LkRyb3ApXG4gIC5jb25zdGFudCgnSGVhcCcsIHdpbmRvdy5IZWFwKVxuICAvLyBjb25zdGFudHNcbiAgLmNvbnN0YW50KCdjb25zdHMnLCB7XG4gICAgYWRkQ291bnQ6IHRydWUsIC8vIGFkZCBjb3VudCBmaWVsZCB0byBEYXRhc2V0LmRhdGFzY2hlbWFcbiAgICBkZWJ1ZzogdHJ1ZSxcbiAgICB1c2VVcmw6IHRydWUsXG4gICAgbG9nZ2luZzogdHJ1ZSxcbiAgICBkZWZhdWx0Q29uZmlnU2V0OiAnbGFyZ2UnLFxuICAgIGFwcElkOiAndmx1aScsXG4gICAgLy8gZW1iZWRkZWQgcG9sZXN0YXIgYW5kIHZveWFnZXIgd2l0aCBrbm93biBkYXRhXG4gICAgZW1iZWRkZWREYXRhOiB3aW5kb3cudmd1aURhdGEgfHwgdW5kZWZpbmVkLFxuICAgIHByaW9yaXR5OiB7XG4gICAgICBib29rbWFyazogMCxcbiAgICAgIHBvcHVwOiAwLFxuICAgICAgdmlzbGlzdDogMTAwMFxuICAgIH0sXG4gICAgbXlyaWFSZXN0OiAnaHR0cDovL2VjMi01Mi0xLTM4LTE4Mi5jb21wdXRlLTEuYW1hem9uYXdzLmNvbTo4NzUzJyxcbiAgICB0eXBlTmFtZXM6IHtcbiAgICAgIE46ICd0ZXh0JyxcbiAgICAgIE86ICd0ZXh0LW9yZGluYWwnLFxuICAgICAgUTogJ251bWJlcicsXG4gICAgICBUOiAndGltZScsXG4gICAgICBHOiAnZ2VvJ1xuICAgIH1cbiAgfSlcbiAgLmNvbmZpZyhmdW5jdGlvbiAoQW5hbHl0aWNzUHJvdmlkZXIpIHtcbiAgICBBbmFseXRpY3NQcm92aWRlclxuICAgICAgLnNldEFjY291bnQoeyB0cmFja2VyOiAnVUEtNDQ0Mjg0NDYtNCcsIG5hbWU6ICd2b3lhZ2VyJywgdHJhY2tFdmVudDogdHJ1ZSB9KTtcbiAgfSk7XG4iLCJhbmd1bGFyLm1vZHVsZShcInZsdWlcIikucnVuKFtcIiR0ZW1wbGF0ZUNhY2hlXCIsIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7JHRlbXBsYXRlQ2FjaGUucHV0KFwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2ZmxleCBmdWxsLXdpZHRoIGZ1bGwtaGVpZ2h0XFxcIiBpZD1cXFwiZXZzXFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1oZWFkZXIgbm8tc2hyaW5rIGNhcmQgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW5cXFwiPjxtb2RhbC1jbG9zZS1idXR0b24gb24tY2xvc2U9XFxcImxvZ0Jvb2ttYXJrc0Nsb3NlZCgpXFxcIj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDIgY2xhc3M9XFxcIm5vLWJvdHRvbS1tYXJnaW5cXFwiPkJvb2ttYXJrcyAoe3sgQm9va21hcmtzLmxlbmd0aCB9fSk8L2gyPjxhIG5nLWNsaWNrPVxcXCJCb29rbWFya3MuY2xlYXIoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoLW9cXFwiPjwvaT4gQ2xlYXIgYWxsPC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZsZXgtZ3Jvdy0xIHNjcm9sbC15XFxcIj48ZGl2IG5nLWlmPVxcXCJCb29rbWFya3MubGVuZ3RoID4gMFxcXCIgY2xhc3M9XFxcInZpcy1saXN0IGhmbGV4IGZsZXgtd3JhcFxcXCI+PHZsLXBsb3QtZ3JvdXAgbmctcmVwZWF0PVxcXCJjaGFydCBpbiBCb29rbWFya3MuZGljdCB8IG9yZGVyT2JqZWN0QnkgOiBcXCd0aW1lQWRkZWRcXCcgOiBmYWxzZVxcXCIgY2xhc3M9XFxcIndyYXBwZWQtdmwtcGxvdC1ncm91cFxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBmaWVsZC1zZXQ9XFxcImNoYXJ0LmZpZWxkU2V0XFxcIiBzaG93LWJvb2ttYXJrPVxcXCJ0cnVlXFxcIiBzaG93LWRlYnVnPVxcXCJjb25zdHMuZGVidWdcXFwiIHNob3ctZXhwYW5kPVxcXCJmYWxzZVxcXCIgYWx3YXlzLXNlbGVjdGVkPVxcXCJ0cnVlXFxcIiBoaWdobGlnaHRlZD1cXFwiaGlnaGxpZ2h0ZWRcXFwiIG5nLW1vdXNlb3Zlcj1cXFwiKGhpZ2hsaWdodGVkfHx7fSlbZmllbGQubmFtZV0gPSB0cnVlXFxcIiBuZy1tb3VzZW91dD1cXFwiKGhpZ2hsaWdodGVkfHx7fSlbZmllbGQubmFtZV0gPSBmYWxzZVxcXCIgb3ZlcmZsb3c9XFxcInRydWVcXFwiIHRvb2x0aXA9XFxcInRydWVcXFwiIHByaW9yaXR5PVxcXCJjb25zdHMucHJpb3JpdHkuYm9va21hcmtcXFwiPjwvdmwtcGxvdC1ncm91cD48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1lbXB0eVxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5sZW5ndGggPT09IDBcXFwiPllvdSBoYXZlIG5vIGJvb2ttYXJrczwvZGl2PjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImFkZC1teXJpYS1kYXRhc2V0XFxcIj48cD5TZWxlY3QgYSBkYXRhc2V0IGZyb20gdGhlIE15cmlhIGluc3RhbmNlIGF0IDxjb2RlPnt7bXlyaWFSZXN0VXJsfX08L2NvZGU+LjwvcD48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZERhdGFzZXQobXlyaWFEYXRhc2V0KVxcXCI+PHVpLXNlbGVjdCBuZy1tb2RlbD1cXFwiJHBhcmVudC5teXJpYURhdGFzZXRcXFwiIHN0eWxlPVxcXCJ3aWR0aDogMzAwcHhcXFwiIHRoZW1lPVxcXCJzZWxlY3RpemVcXFwiIG5nLWRpc2FibGVkPVxcXCJkaXNhYmxlZFxcXCIgcmVzZXQtc2VhcmNoLWlucHV0PVxcXCJmYWxzZVxcXCI+PHVpLXNlbGVjdC1tYXRjaCBwbGFjZWhvbGRlcj1cXFwiU2VsZWN0IGRhdGFzZXQuLi5cXFwiPnt7JHNlbGVjdC5zZWxlY3RlZC5yZWxhdGlvbk5hbWV9fTwvdWktc2VsZWN0LW1hdGNoPjx1aS1zZWxlY3QtY2hvaWNlcyBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiByZXBlYXQ9XFxcImRhdGFzZXQgaW4gbXlyaWFEYXRhc2V0c1xcXCIgcmVmcmVzaD1cXFwibG9hZERhdGFzZXRzKCRzZWxlY3Quc2VhcmNoKVxcXCIgcmVmcmVzaC1kZWxheT1cXFwiMTAwXFxcIj57eyBkYXRhc2V0LnVzZXJOYW1lfX06e3tkYXRhc2V0LnByb2dyYW1OYW1lfX06e3tkYXRhc2V0LnJlbGF0aW9uTmFtZSB9fTwvdWktc2VsZWN0LWNob2ljZXM+PC91aS1zZWxlY3Q+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvYWRkdXJsZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtdXJsLWRhdGFzZXRcXFwiPjxwPkFkZCB0aGUgbmFtZSBvZiB0aGUgZGF0YXNldCBhbmQgdGhlIFVSTCB0byBhIDxiPkpTT048L2I+IG9yIDxiPkNTVjwvYj4gKHdpdGggaGVhZGVyKSBmaWxlLiBNYWtlIHN1cmUgdGhhdCB0aGUgZm9ybWF0dGluZyBpcyBjb3JyZWN0IGFuZCBjbGVhbiB0aGUgZGF0YSBiZWZvcmUgYWRkaW5nIGl0IHRvIFZveWFnZXIuIFRoZSBhZGRlZCBkYXRhc2V0IGlzIG9ubHkgdmlzaWJsZSB0byB5b3UuPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRnJvbVVybChhZGRlZERhdGFzZXQpXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LW5hbWVcXFwiPk5hbWU8L2xhYmVsPiA8aW5wdXQgbmctbW9kZWw9XFxcImFkZGVkRGF0YXNldC5uYW1lXFxcIiBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LXVybFxcXCI+VVJMPC9sYWJlbD4gPGlucHV0IG5nLW1vZGVsPVxcXCJhZGRlZERhdGFzZXQudXJsXFxcIiBpZD1cXFwiZGF0YXNldC11cmxcXFwiIHR5cGU9XFxcInVybFxcXCI+PHA+TWFrZSBzdXJlIHRoYXQgeW91IGhvc3QgdGhlIGZpbGUgb24gYSBzZXJ2ZXIgdGhhdCBoYXMgPGNvZGU+QWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luOiAqPC9jb2RlPiBzZXQuPC9wPjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImRhdGFzZXQtbW9kYWxcXFwiIG1heC13aWR0aD1cXFwiODAwcHhcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlclxcXCI+PG1vZGFsLWNsb3NlLWJ1dHRvbj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDI+QWRkIERhdGFzZXQ8L2gyPjwvZGl2Pjx0YWJzZXQ+PHRhYiBoZWFkaW5nPVxcXCJQYXN0ZSBvciBVcGxvYWQgRGF0YVxcXCI+PHBhc3RlLWRhdGFzZXQ+PC9wYXN0ZS1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiRnJvbSBVUkxcXFwiPjxhZGQtdXJsLWRhdGFzZXQ+PC9hZGQtdXJsLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJGcm9tIE15cmlhXFxcIj48YWRkLW15cmlhLWRhdGFzZXQ+PC9hZGQtbXlyaWEtZGF0YXNldD48L3RhYj48L3RhYnNldD48L21vZGFsPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmh0bWxcIixcIjxkaXY+PGRpdiBjbGFzcz1cXFwib3Blbi1kYXRhc2V0LXBvcHVwXFxcIj48L2Rpdj48c2VsZWN0IGlkPVxcXCJkYXRhc2V0LXNlbGVjdFxcXCIgbmctbW9kZWw9XFxcIkRhdGFzZXQuZGF0YXNldFxcXCIgbmctY2hhbmdlPVxcXCJkYXRhc2V0Q2hhbmdlZCgpXFxcIiBuZy1vcHRpb25zPVxcXCJkYXRhc2V0Lm5hbWUgZ3JvdXAgYnkgZGF0YXNldC5ncm91cCBmb3IgZGF0YXNldCBpbiBEYXRhc2V0LmRhdGFzZXRzIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiPjxvcHRpb24gdmFsdWU9XFxcIlxcXCI+QWRkIGRhdGFzZXQuLi48L29wdGlvbj48L3NlbGVjdD48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wem9uZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJwYXN0ZS1kYXRhXFxcIj48ZmlsZS1kcm9wem9uZSBkYXRhc2V0PVxcXCJkYXRhc2V0XFxcIiBtYXgtZmlsZS1zaXplPVxcXCIzXFxcIiB2YWxpZC1taW1lLXR5cGVzPVxcXCJbdGV4dC9jc3YsIHRleHQvanNvbiwgdGV4dC90c3ZdXFxcIj48ZGl2IGNsYXNzPVxcXCJ1cGxvYWQtZGF0YVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1maWxlXFxcIj5GaWxlPC9sYWJlbD4gPGlucHV0IHR5cGU9XFxcImZpbGVcXFwiIGlkPVxcXCJkYXRhc2V0LWZpbGVcXFwiIGFjY2VwdD1cXFwidGV4dC9jc3YsdGV4dC90c3ZcXFwiPjwvZGl2PjxwPlVwbG9hZCBhIENTViwgb3IgcGFzdGUgZGF0YSBpbiA8YSBocmVmPVxcXCJodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Db21tYS1zZXBhcmF0ZWRfdmFsdWVzXFxcIj5DU1Y8L2E+IGZvcm1hdCBpbnRvIHRoZSBmaWVsZHMuPC9wPjxkaXYgY2xhc3M9XFxcImRyb3B6b25lLXRhcmdldFxcXCI+PHA+RHJvcCBDU1YgZmlsZSBoZXJlPC9wPjwvZGl2PjwvZGl2Pjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldCgpXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LW5hbWVcXFwiPk5hbWU8L2xhYmVsPiA8aW5wdXQgdHlwZT1cXFwibmFtZVxcXCIgbmctbW9kZWw9XFxcImRhdGFzZXQubmFtZVxcXCIgaWQ9XFxcImRhdGFzZXQtbmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PHRleHRhcmVhIG5nLW1vZGVsPVxcXCJkYXRhc2V0LmRhdGFcXFwiIG5nLW1vZGVsLW9wdGlvbnM9XFxcInsgdXBkYXRlT246IFxcJ2RlZmF1bHQgYmx1clxcJywgZGVib3VuY2U6IHsgXFwnZGVmYXVsdFxcJzogMTcsIFxcJ2JsdXJcXCc6IDAgfX1cXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcbiAgICAgIDwvdGV4dGFyZWE+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhPC9idXR0b24+PC9mb3JtPjwvZmlsZS1kcm9wem9uZT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJmaWVsZGluZm8vZmllbGRpbmZvLmh0bWxcIixcIjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1pbmZvXFxcIj48c3BhbiBjbGFzcz1cXFwiaGZsZXggZnVsbC13aWR0aFxcXCIgbmctY2xpY2s9XFxcImNsaWNrZWQoJGV2ZW50KVxcXCI+PHNwYW4gY2xhc3M9XFxcInR5cGUtY2FyZXRcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiAhZGlzYWJsZUNvdW50Q2FyZXQgfHwgZmllbGQuYWdncmVnYXRlIT09XFwnY291bnRcXCd9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93blxcXCIgbmctc2hvdz1cXFwic2hvd0NhcmV0XFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJ0eXBlIGZhIHt7aWNvbn19XFxcIiBuZy1zaG93PVxcXCJzaG93VHlwZVxcXCIgdGl0bGU9XFxcInt7dHlwZU5hbWVzW2ZpZWxkLnR5cGVdfX1cXFwiPjwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZC5hZ2dyZWdhdGUhPT1cXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gbmctaWY9XFxcImZ1bmMoZmllbGQpXFxcIiBjbGFzcz1cXFwiZmllbGQtZnVuY1xcXCIgbmctY2xhc3M9XFxcInthbnk6IGZpZWxkLl9hbnl9XFxcIj57eyBmdW5jKGZpZWxkKSA9PT0gXFwnYXZnXFwnID8gXFwnbWVhblxcJyA6IGZ1bmMoZmllbGQpIH19PC9zcGFuPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIiBuZy1jbGFzcz1cXFwie2hhc2Z1bmM6IGZ1bmMoZmllbGQpLCBhbnk6IGZpZWxkLl9hbnl9XFxcIj57eyBmaWVsZC5uYW1lIHwgdW5kZXJzY29yZTJzcGFjZSB9fTwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZC5hZ2dyZWdhdGU9PT1cXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZpZWxkLWNvdW50IGZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gY2xhc3M9XFxcImZpZWxkLW5hbWVcXFwiPkNPVU5UPC9zcGFuPjwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIm5vLXNocmluayByZW1vdmVcXFwiIG5nLXNob3c9XFxcInNob3dSZW1vdmVcXFwiPjxhIGNsYXNzPVxcXCJyZW1vdmUtZmllbGRcXFwiIG5nLWNsaWNrPVxcXCJyZW1vdmVBY3Rpb24oKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+PC9hPjwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIm5vLXNocmluayBpbmZvXFxcIiBuZy1zaG93PVxcXCJzaG93SW5mb1xcXCI+PGkgbmctaWY9XFxcImZpZWxkLmFnZ3JlZ2F0ZSAhPT0gXFwnY291bnRcXCcgJiYgaXNUeXBlcyhmaWVsZCwgW1xcJ05cXCcsIFxcJ09cXCddKVxcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPk5hbWU6PC9zdHJvbmc+IHt7ZmllbGQubmFtZX19PGJyPiA8c3Ryb25nPkNhcmRpbmFsaXR5Ojwvc3Ryb25nPiB7e3N0YXRzLmRpc3RpbmN0IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWluOjwvc3Ryb25nPiB7e3N0YXRzLm1pbn19PGJyPiA8c3Ryb25nPk1heDo8L3N0cm9uZz4ge3tzdGF0cy5tYXh9fTxicj4gPHN0cm9uZz5TYW1wbGU6PC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcJ3NhbXBsZVxcJz57e3N0YXRzLnNhbXBsZS5qb2luKFxcJywgXFwnKX19PC9zcGFuPiA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT4gPGkgbmctaWY9XFxcImZpZWxkLmFnZ3JlZ2F0ZSAhPT0gXFwnY291bnRcXCcgJiYgZmllbGQudHlwZSA9PT0gXFwnVFxcJ1xcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPk5hbWU6PC9zdHJvbmc+IHt7ZmllbGQubmFtZX19PGJyPiA8c3Ryb25nPkNhcmRpbmFsaXR5Ojwvc3Ryb25nPiB7e3N0YXRzLmRpc3RpbmN0IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWluOjwvc3Ryb25nPiB7e3N0YXRzLm1pbiB8IGRhdGU6IHNob3J0fX08YnI+IDxzdHJvbmc+TWF4Ojwvc3Ryb25nPiB7e3N0YXRzLm1heCB8IGRhdGU6IHNob3J0fX08YnI+IDxzdHJvbmc+U2FtcGxlOjwvc3Ryb25nPiA8c3BhbiBjbGFzcz1cXCdzYW1wbGVcXCc+e3tzdGF0cy5zYW1wbGUuam9pbihcXCcsIFxcJyl9fTwvc3Bhbj4gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+IDxpIG5nLWlmPVxcXCJmaWVsZC5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnICYmIGZpZWxkLnR5cGUgPT09IFxcJ1FcXCdcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkLm5hbWV9fTxicj4gPHN0cm9uZz5DYXJkaW5hbGl0eTo8L3N0cm9uZz4ge3tzdGF0cy5kaXN0aW5jdCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1pbjo8L3N0cm9uZz4ge3tzdGF0cy5taW4gfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+U3RkZXY6PC9zdHJvbmc+IHt7c3RhdHMuc3RkZXYgfCBudW1iZXI6Mn19PGJyPiA8c3Ryb25nPk1lYW46PC9zdHJvbmc+IHt7c3RhdHMubWVhbiB8IG51bWJlcjoyfX08YnI+IDxzdHJvbmc+TWVkaWFuOjwvc3Ryb25nPiB7e3N0YXRzLm1lZGlhbiB8IG51bWJlcn19PGJyPiA8c3Ryb25nPlNhbXBsZTo8L3N0cm9uZz4gPHNwYW4gY2xhc3M9XFwnc2FtcGxlXFwnPnt7c3RhdHMuc2FtcGxlLmpvaW4oXFwnLCBcXCcpfX08L3NwYW4+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPjxpIG5nLWlmPVxcXCJmaWVsZC5hZ2dyZWdhdGUgPT09IFxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+Q291bnQ6PC9zdHJvbmc+IHt7c3RhdHMubWF4fX0gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+PC9zcGFuPjwvc3Bhbj48L3NwYW4+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwibW9kYWwvbW9kYWwuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwibW9kYWxcXFwiIG5nLWlmPVxcXCJpc09wZW5cXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLXdyYXBwZXJcXFwiIHN0eWxlPVxcXCJ7e3dyYXBwZXJTdHlsZX19XFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcIm1vZGFsL21vZGFsY2xvc2VidXR0b24uaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwicmlnaHRcXFwiPjxhIG5nLWNsaWNrPVxcXCJjbG9zZU1vZGFsKClcXFwiIGNsYXNzPVxcXCJyaWdodFxcXCI+Q2xvc2U8L2E+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGFicy90YWIuaHRtbFwiLFwiPGRpdiBuZy1pZj1cXFwiYWN0aXZlXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRhYnMvdGFic2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInRhYi1jb250YWluZXJcXFwiPjxkaXY+PGEgaHJlZj1cXFwiXFxcIiBjbGFzcz1cXFwidGFiXFxcIiBuZy1yZXBlYXQ9XFxcInRhYiBpbiB0YWJzZXQudGFic1xcXCIgbmctY2xhc3M9XFxcIntcXCdhY3RpdmVcXCc6IHRhYi5hY3RpdmV9XFxcIiBuZy1jbGljaz1cXFwidGFic2V0LnNob3dUYWIodGFiKVxcXCI+e3t0YWIuaGVhZGluZ319PC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRhYi1jb250ZW50c1xcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwIGNhcmQgdmZsZXhcXFwiPjxkaXYgbmctc2hvdz1cXFwic2hvd0V4cGFuZCB8fCBmaWVsZFNldCB8fCBzaG93VHJhbnNwb3NlIHx8IHNob3dCb29rbWFyayAmJiBCb29rbWFya3MuaXNTdXBwb3J0ZWQgfHwgc2hvd1RvZ2dsZVxcXCIgY2xhc3M9XFxcInZsLXBsb3QtZ3JvdXAtaGVhZGVyIGZ1bGwtd2lkdGggbm8tc2hyaW5rXFxcIj48ZGl2IGNsYXNzPVxcXCJmaWVsZC1zZXQtaW5mb1xcXCI+PGZpZWxkLWluZm8gbmctcmVwZWF0PVxcXCJmaWVsZCBpbiBmaWVsZFNldFxcXCIgbmctaWY9XFxcImZpZWxkU2V0XFxcIiBmaWVsZD1cXFwiZmllbGRcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgbmctY2xhc3M9XFxcInsgc2VsZWN0ZWQ6IGFsd2F5c1NlbGVjdGVkIHx8IChpc1NlbGVjdGVkICYmIGlzU2VsZWN0ZWQoZmllbGQubmFtZSkpLCB1bnNlbGVjdGVkOiBpc1NlbGVjdGVkICYmICFpc1NlbGVjdGVkKGZpZWxkLm5hbWUpLCBoaWdobGlnaHRlZDogKGhpZ2hsaWdodGVkfHx7fSlbZmllbGQubmFtZV0gfVxcXCIgbmctbW91c2VvdmVyPVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZC5uYW1lXSA9IHRydWVcXFwiIG5nLW1vdXNlb3V0PVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZC5uYW1lXSA9IGZhbHNlXFxcIj48L2ZpZWxkLWluZm8+PC9kaXY+PGRpdiBjbGFzcz1cXFwidG9vbGJveFxcXCI+PGEgbmctc2hvdz1cXFwiY29uc3RzLmRlYnVnICYmIHNob3dEZWJ1Z1xcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS13cmVuY2hcXFwiIG5nLWNsaWNrPVxcXCJzaENvcGllZD1cXCdcXCc7IHZsQ29waWVkPVxcJ1xcJzsgdmdDb3BpZWQ9XFwnXFwnO1xcXCI+PC9pPjwvYT48ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBwb3B1cC1jb21tYW5kIG5vLXNocmluayBkZXYtdG9vbFxcXCI+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WbHM8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJzaENvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LnNob3J0aGFuZFxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZMIHNob3J0aGFuZFxcJywgY2hhcnQuc2hvcnRoYW5kKTsgc2hDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7c2hDb3BpZWR9fTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZsPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwidmxDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC5jbGVhblNwZWMgfCBjb21wYWN0SlNPTlxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZlZ2EtbGl0ZVxcJywgY2hhcnQuY2xlYW5TcGVjKTsgdmxDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7dmxDb3BpZWR9fTwvc3Bhbj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZnPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwidmdDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC52Z1NwZWMgfCBjb21wYWN0SlNPTlxcXCI+Q29weTwvYT4gLyA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIG5nLWNsaWNrPVxcXCJsb2dDb2RlKFxcJ1ZlZ2FcXCcsIGNoYXJ0LnZnU3BlYyk7IHZnQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZnQ29waWVkfX08L3NwYW4+PC9kaXY+PGEgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiIG5nLWhyZWY9XFxcInt7IHt0eXBlOlxcJ3ZsXFwnLCBlbmNvZGluZzogY2hhcnQuY2xlYW5TcGVjfSB8IHJlcG9ydFVybCB9fVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPlJlcG9ydCBCYWQgUmVuZGVyPC9hPiA8YSBuZy1jbGljaz1cXFwic2hvd0ZlYXR1cmU9IXNob3dGZWF0dXJlXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+e3tjaGFydC5zY29yZX19PC9hPjxkaXYgbmctcmVwZWF0PVxcXCJmIGluIGNoYXJ0LnNjb3JlRmVhdHVyZXMgdHJhY2sgYnkgZi5yZWFzb25cXFwiPlt7e2Yuc2NvcmV9fV0ge3tmLnJlYXNvbn19PC9kaXY+PC9kaXY+PC9kaXY+PGEgbmctaWY9XFxcInNob3dNYXJrVHlwZVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGlzYWJsZWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1mb250XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1saW5lLWNoYXJ0XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1hcmVhLWNoYXJ0XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1iYXItY2hhcnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWNpcmNsZS1vXFxcIj48L2k+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0xvZyAmJiBjaGFydC52bFNwZWMgJiYgbG9nLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBcXCd4XFwnKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneFxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy1yaWdodFxcXCI+PC9pPiA8c21hbGw+TE9HIFg8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwibG9nLnRvZ2dsZShjaGFydC52bFNwZWMsIFxcJ3lcXCcpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogbG9nLmFjdGl2ZShjaGFydC52bFNwZWMsIFxcJ3lcXCcpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvbmctYXJyb3ctdXBcXFwiPjwvaT4gPHNtYWxsPkxPRyBZPC9zbWFsbD48L2E+IDxhIG5nLXNob3c9XFxcInNob3dTb3J0ICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVTb3J0LnN1cHBvcnQoY2hhcnQudmxTcGVjLCBEYXRhc2V0LnN0YXRzKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVTb3J0KGNoYXJ0LnZsU3BlYylcXFwiPjxpIGNsYXNzPVxcXCJmYSBzb3J0XFxcIiBuZy1jbGFzcz1cXFwidG9nZ2xlU29ydENsYXNzKGNoYXJ0LnZsU3BlYylcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPlNvcnQ8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dGaWx0ZXJOdWxsICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBEYXRhc2V0LnN0YXRzKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVGaWx0ZXJOdWxsKGNoYXJ0LnZsU3BlYylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBjaGFydC52bFNwZWMgJiYgY2hhcnQudmxTcGVjLmNmZy5maWx0ZXJOdWxsLk99XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZmlsdGVyXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5GaWx0ZXI8L3NtYWxsPiA8c21hbGw+TlVMTDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1RyYW5zcG9zZVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0cmFuc3Bvc2UoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXJlZnJlc2ggdHJhbnNwb3NlXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5UcmFuc3Bvc2U8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dCb29rbWFyayAmJiBCb29rbWFya3MuaXNTdXBwb3J0ZWRcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwiQm9va21hcmtzLnRvZ2dsZShjaGFydClcXFwiIG5nLWNsYXNzPVxcXCJ7ZGlzYWJsZWQ6ICFjaGFydC52bFNwZWMuZW5jb2RpbmcsIGFjdGl2ZTogQm9va21hcmtzLmlzQm9va21hcmtlZChjaGFydC5zaG9ydGhhbmQpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWJvb2ttYXJrXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Cb29rbWFyazwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0V4cGFuZFxcXCIgbmctY2xpY2s9XFxcImV4cGFuZEFjdGlvbigpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPjwvYT48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LXdyYXBwZXIgZnVsbC13aWR0aCB2aXMte3tmaWVsZFNldC5rZXl9fSBmbGV4LWdyb3ctMVxcXCI+PHZsLXBsb3QgY2hhcnQ9XFxcImNoYXJ0XFxcIiBkaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIGlzLWluLWxpc3Q9XFxcImlzSW5MaXN0XFxcIiBhbHdheXMtc2Nyb2xsYWJsZT1cXFwiYWx3YXlzU2Nyb2xsYWJsZVxcXCIgY29uZmlnLXNldD1cXFwie3tjb25maWdTZXR8fFxcJ3NtYWxsXFwnfX1cXFwiIG1heC1oZWlnaHQ9XFxcIm1heEhlaWdodFxcXCIgbWF4LXdpZHRoPVxcXCJtYXhXaWR0aFxcXCIgb3ZlcmZsb3c9XFxcIm92ZXJmbG93XFxcIiBwcmlvcml0eT1cXFwicHJpb3JpdHlcXFwiIHJlc2NhbGU9XFxcInJlc2NhbGVcXFwiIHRodW1ibmFpbD1cXFwidGh1bWJuYWlsXFxcIiB0b29sdGlwPVxcXCJ0b29sdGlwXFxcIj48L3ZsLXBsb3Q+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidmxwbG90L3ZscGxvdC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2aXNcXFwiIGlkPVxcXCJ2aXMte3t2aXNJZH19XFxcIiBuZy1jbGFzcz1cXFwieyBmaXQ6ICFhbHdheXNTY3JvbGxhYmxlICYmICFvdmVyZmxvdyAmJiAobWF4SGVpZ2h0ICYmICghaGVpZ2h0IHx8IGhlaWdodCA8PSBtYXhIZWlnaHQpKSAmJiAobWF4V2lkdGggJiYgKCF3aWR0aCB8fCB3aWR0aCA8PSBtYXhXaWR0aCkpLCBvdmVyZmxvdzogYWx3YXlzU2Nyb2xsYWJsZSB8fCBvdmVyZmxvdyB8fCAobWF4SGVpZ2h0ICYmIGhlaWdodCAmJiBoZWlnaHQgPiBtYXhIZWlnaHQpIHx8IChtYXhXaWR0aCAmJiB3aWR0aCAmJiB3aWR0aCA+IG1heFdpZHRoKSwgc2Nyb2xsOiBhbHdheXNTY3JvbGxhYmxlIHx8IHVubG9ja2VkIHx8IGhvdmVyRm9jdXMgfVxcXCIgbmctbW91c2Vkb3duPVxcXCJ1bmxvY2tlZD0hdGh1bWJuYWlsXFxcIiBuZy1tb3VzZXVwPVxcXCJ1bmxvY2tlZD1mYWxzZVxcXCIgbmctbW91c2VvdmVyPVxcXCJtb3VzZW92ZXIoKVxcXCIgbmctbW91c2VvdXQ9XFxcIm1vdXNlb3V0KClcXFwiPjxkaXYgY2xhc3M9XFxcInZpcy10b29sdGlwXFxcIiBuZy1zaG93PVxcXCJ0b29sdGlwQWN0aXZlXFxcIj48dGFibGU+PHRyIG5nLXJlcGVhdD1cXFwicCBpbiBkYXRhXFxcIj48dGQgY2xhc3M9XFxcImtleVxcXCI+e3twWzBdfX08L3RkPjx0ZCBjbGFzcz1cXFwidmFsdWVcXFwiPjxiPnt7cFsxXX19PC9iPjwvdGQ+PC90cj48L3RhYmxlPjwvZGl2PjwvZGl2PlwiKTt9XSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdBbGVydHMnLCBmdW5jdGlvbigkdGltZW91dCwgXykge1xuICAgIHZhciBBbGVydHMgPSB7fTtcblxuICAgIEFsZXJ0cy5hbGVydHMgPSBbXTtcblxuICAgIEFsZXJ0cy5hZGQgPSBmdW5jdGlvbihtc2csIGRpc21pc3MpIHtcbiAgICAgIHZhciBtZXNzYWdlID0ge21zZzogbXNnfTtcbiAgICAgIEFsZXJ0cy5hbGVydHMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmIChkaXNtaXNzKSB7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBpbmRleCA9IF8uZmluZEluZGV4KEFsZXJ0cy5hbGVydHMsIG1lc3NhZ2UpO1xuICAgICAgICAgIEFsZXJ0cy5jbG9zZUFsZXJ0KGluZGV4KTtcbiAgICAgICAgfSwgZGlzbWlzcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIEFsZXJ0cy5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIEFsZXJ0cy5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFsZXJ0cztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Ym9va21hcmtMaXN0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYm9va21hcmtMaXN0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYm9va21hcmtMaXN0JywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoaWdobGlnaHRlZDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgLy8gVGhlIGJvb2ttYXJrIGxpc3QgaXMgZGVzaWduZWQgdG8gcmVuZGVyIHdpdGhpbiBhIG1vZGFsIG92ZXJsYXkuXG4gICAgICAgIC8vIEJlY2F1c2UgbW9kYWwgY29udGVudHMgYXJlIGhpZGRlbiB2aWEgbmctaWYsIGlmIHRoaXMgbGluayBmdW5jdGlvbiBpc1xuICAgICAgICAvLyBleGVjdXRpbmcgaXQgaXMgYmVjYXVzZSB0aGUgZGlyZWN0aXZlIGlzIGJlaW5nIHNob3duLiBMb2cgdGhlIGV2ZW50OlxuICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfT1BFTik7XG4gICAgICAgIHNjb3BlLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19DTE9TRSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuQm9va21hcmtzID0gQm9va21hcmtzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuQm9va21hcmtzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgQm9va21hcmtzXG4gKiBTZXJ2aWNlIGluIHRoZSB2bHVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdCb29rbWFya3MnLCBmdW5jdGlvbihfLCB2bCwgbG9jYWxTdG9yYWdlU2VydmljZSwgTG9nZ2VyLCBEYXRhc2V0KSB7XG4gICAgdmFyIEJvb2ttYXJrcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgICB0aGlzLmlzU3VwcG9ydGVkID0gbG9jYWxTdG9yYWdlU2VydmljZS5pc1N1cHBvcnRlZDtcbiAgICB9O1xuXG4gICAgdmFyIHByb3RvID0gQm9va21hcmtzLnByb3RvdHlwZTtcblxuICAgIHByb3RvLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5sZW5ndGggPSBPYmplY3Qua2V5cyh0aGlzLmRpY3QpLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgcHJvdG8uc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgbG9jYWxTdG9yYWdlU2VydmljZS5zZXQoJ2Jvb2ttYXJrcycsIHRoaXMuZGljdCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZGljdCA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KCdib29rbWFya3MnKSB8fCB7fTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgfTtcblxuICAgIHByb3RvLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMRUFSKTtcbiAgICB9O1xuXG4gICAgcHJvdG8udG9nZ2xlID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgIHZhciBzaG9ydGhhbmQgPSBjaGFydC5zaG9ydGhhbmQ7XG5cbiAgICAgIGlmICh0aGlzLmRpY3Rbc2hvcnRoYW5kXSkge1xuICAgICAgICB0aGlzLnJlbW92ZShjaGFydCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFkZChjaGFydCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHByb3RvLmFkZCA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICBjb25zb2xlLmxvZygnYWRkaW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBjaGFydC50aW1lQWRkZWQgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXG4gICAgICBjaGFydC5zdGF0cyA9IERhdGFzZXQuc3RhdHM7XG5cbiAgICAgIHRoaXMuZGljdFtzaG9ydGhhbmRdID0gXy5jbG9uZURlZXAoY2hhcnQpO1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQURELCBzaG9ydGhhbmQpO1xuICAgIH07XG5cbiAgICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgY29uc29sZS5sb2coJ3JlbW92aW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBkZWxldGUgdGhpcy5kaWN0W3Nob3J0aGFuZF07XG4gICAgICB0aGlzLnVwZGF0ZUxlbmd0aCgpO1xuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19SRU1PVkUsIHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLmlzQm9va21hcmtlZCA9IGZ1bmN0aW9uKHNob3J0aGFuZCkge1xuICAgICAgcmV0dXJuIHNob3J0aGFuZCBpbiB0aGlzLmRpY3Q7XG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgQm9va21hcmtzKCk7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBTZXJ2aWNlIGZvciB0aGUgc3BlYyBjb25maWcuXG4vLyBXZSBrZWVwIHRoaXMgc2VwYXJhdGUgc28gdGhhdCBjaGFuZ2VzIGFyZSBrZXB0IGV2ZW4gaWYgdGhlIHNwZWMgY2hhbmdlcy5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0NvbmZpZycsIGZ1bmN0aW9uKHZsLCBfKSB7XG4gICAgdmFyIENvbmZpZyA9IHt9O1xuXG4gICAgQ29uZmlnLnNjaGVtYSA9IHZsLnNjaGVtYS5zY2hlbWEucHJvcGVydGllcy5jb25maWc7XG4gICAgQ29uZmlnLmRhdGFzY2hlbWEgPSB2bC5zY2hlbWEuc2NoZW1hLnByb3BlcnRpZXMuZGF0YTtcblxuICAgIENvbmZpZy5kYXRhID0gdmwuc2NoZW1hLnV0aWwuaW5zdGFudGlhdGUoQ29uZmlnLmRhdGFzY2hlbWEpO1xuICAgIENvbmZpZy5jb25maWcgPSB2bC5zY2hlbWEudXRpbC5pbnN0YW50aWF0ZShDb25maWcuc2NoZW1hKTtcblxuICAgIENvbmZpZy5nZXRDb25maWcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfLmNsb25lRGVlcChDb25maWcuY29uZmlnKTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmdldERhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfLmNsb25lRGVlcChDb25maWcuZGF0YSk7XG4gICAgfTtcblxuICAgIENvbmZpZy5sYXJnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2luZ2xlV2lkdGg6IDQwMCxcbiAgICAgICAgc2luZ2xlSGVpZ2h0OiA0MDAsXG4gICAgICAgIGxhcmdlQmFuZE1heENhcmRpbmFsaXR5OiAyMFxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnNtYWxsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfTtcblxuICAgIENvbmZpZy51cGRhdGVEYXRhc2V0ID0gZnVuY3Rpb24oZGF0YXNldCwgdHlwZSkge1xuICAgICAgaWYgKGRhdGFzZXQudmFsdWVzKSB7XG4gICAgICAgIENvbmZpZy5kYXRhLnZhbHVlcyA9IGRhdGFzZXQudmFsdWVzO1xuICAgICAgICBkZWxldGUgQ29uZmlnLmRhdGEudXJsO1xuICAgICAgICBDb25maWcuZGF0YS5mb3JtYXRUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudXJsID0gZGF0YXNldC51cmw7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS52YWx1ZXM7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB0eXBlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gQ29uZmlnO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRNeXJpYURhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRNeXJpYURhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhZGRNeXJpYURhdGFzZXQnLCBmdW5jdGlvbiAoJGh0dHAsIERhdGFzZXQsIGNvbnN0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5teXJpYVJlc3RVcmwgPSBjb25zdHMubXlyaWFSZXN0O1xuICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gW107XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldCA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXRzID0gZnVuY3Rpb24ocXVlcnkpIHtcbiAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC9zZWFyY2gvP3E9JyArIHF1ZXJ5KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0cyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGREYXRhc2V0ID0gZnVuY3Rpb24obXlyaWFEYXRhc2V0KSB7XG4gICAgICAgICAgdmFyIGRhdGFzZXQgPSB7XG4gICAgICAgICAgICBncm91cDogJ215cmlhJyxcbiAgICAgICAgICAgIG5hbWU6IG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUsXG4gICAgICAgICAgICB1cmw6IHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC91c2VyLScgKyBteXJpYURhdGFzZXQudXNlck5hbWUgK1xuICAgICAgICAgICAgICAnL3Byb2dyYW0tJyArIG15cmlhRGF0YXNldC5wcm9ncmFtTmFtZSArXG4gICAgICAgICAgICAgICcvcmVsYXRpb24tJyArIG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUgKyAnL2RhdGE/Zm9ybWF0PWpzb24nXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdqc29uJztcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChkYXRhc2V0KTtcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZFVybERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRVcmxEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWRkVXJsRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRoZSBkYXRhc2V0IHRvIGFkZFxuICAgICAgICBzY29wZS5hZGRlZERhdGFzZXQgPSB7XG4gICAgICAgICAgZ3JvdXA6ICd1c2VyJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZEZyb21VcmwgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfTkVXX1VSTCwgZGF0YXNldC51cmwpO1xuXG4gICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIG5ldyBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBGZXRjaCAmIGFjdGl2YXRlIHRoZSBuZXdseS1yZWdpc3RlcmVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBnZXROYW1lTWFwKGRhdGFzY2hlbWEpIHtcbiAgcmV0dXJuIGRhdGFzY2hlbWEucmVkdWNlKGZ1bmN0aW9uKG0sIGZpZWxkKSB7XG4gICAgbVtmaWVsZC5uYW1lXSA9IGZpZWxkO1xuICAgIHJldHVybiBtO1xuICB9LCB7fSk7XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0RhdGFzZXQnLCBmdW5jdGlvbigkaHR0cCwgJHEsIEFsZXJ0cywgXywgZGwsIHZsLCBTYW1wbGVEYXRhLCBDb25maWcsIExvZ2dlcikge1xuICAgIHZhciBEYXRhc2V0ID0ge307XG5cbiAgICAvLyBTdGFydCB3aXRoIHRoZSBsaXN0IG9mIHNhbXBsZSBkYXRhc2V0c1xuICAgIHZhciBkYXRhc2V0cyA9IFNhbXBsZURhdGE7XG5cbiAgICBEYXRhc2V0LmRhdGFzZXRzID0gZGF0YXNldHM7XG4gICAgRGF0YXNldC5kYXRhc2V0ID0gZGF0YXNldHNbMV07XG4gICAgRGF0YXNldC5jdXJyZW50RGF0YXNldCA9IHVuZGVmaW5lZDsgIC8vIGRhdGFzZXQgYmVmb3JlIHVwZGF0ZVxuICAgIERhdGFzZXQuZGF0YXNjaGVtYSA9IFtdO1xuICAgIERhdGFzZXQuZGF0YXNjaGVtYS5ieU5hbWUgPSB7fTtcbiAgICBEYXRhc2V0LnN0YXRzID0ge307XG4gICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuXG4gICAgdmFyIHR5cGVPcmRlciA9IHtcbiAgICAgIE46IDAsXG4gICAgICBPOiAwLFxuICAgICAgRzogMixcbiAgICAgIFQ6IDMsXG4gICAgICBROiA0XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5ID0ge307XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIGlmIChmaWVsZC5hZ2dyZWdhdGU9PT0nY291bnQnKSByZXR1cm4gNDtcbiAgICAgIHJldHVybiB0eXBlT3JkZXJbZmllbGQudHlwZV07XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICByZXR1cm4gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZShmaWVsZCkgKyAnXycgK1xuICAgICAgICAoZmllbGQuYWdncmVnYXRlID09PSAnY291bnQnID8gJ34nIDogZmllbGQubmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgLy8gfiBpcyB0aGUgbGFzdCBjaGFyYWN0ZXIgaW4gQVNDSUlcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkub3JpZ2luYWwgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAwOyAvLyBubyBzd2FwIHdpbGwgb2NjdXJcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkubmFtZSA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICByZXR1cm4gZmllbGQubmFtZTtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkuY2FyZGluYWxpdHkgPSBmdW5jdGlvbihmaWVsZCwgc3RhdHMpIHtcbiAgICAgIHJldHVybiBzdGF0c1tmaWVsZC5uYW1lXS5kaXN0aW5jdDtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyID0gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lO1xuXG4gICAgRGF0YXNldC5nZXRTY2hlbWEgPSBmdW5jdGlvbihkYXRhLCBzdGF0cywgb3JkZXIpIHtcbiAgICAgIHZhciB0eXBlcyA9IGRsLnR5cGUuaW5mZXJBbGwoZGF0YSksXG4gICAgICAgIHNjaGVtYSA9IF8ucmVkdWNlKHR5cGVzLCBmdW5jdGlvbihzLCB0eXBlLCBuYW1lKSB7XG4gICAgICAgICAgdmFyIGZpZWxkID0ge1xuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHR5cGU6IHZsLmRhdGEudHlwZXNbdHlwZV0sXG4gICAgICAgICAgICBwcmltaXRpdmVUeXBlOiB0eXBlXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAnUScgJiYgc3RhdHNbZmllbGQubmFtZV0uZGlzdGluY3QgPD0gNSkge1xuICAgICAgICAgICAgZmllbGQudHlwZSA9ICdPJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzLnB1c2goZmllbGQpO1xuICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICB9LCBbXSk7XG5cbiAgICAgIHNjaGVtYSA9IGRsLnN0YWJsZXNvcnQoc2NoZW1hLCBvcmRlciB8fCBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWUsIERhdGFzZXQuZmllbGRPcmRlckJ5Lm5hbWUpO1xuXG4gICAgICBzY2hlbWEucHVzaCh2bC5maWVsZC5jb3VudCgpKTtcbiAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfTtcblxuICAgIC8vIHVwZGF0ZSB0aGUgc2NoZW1hIGFuZCBzdGF0c1xuICAgIERhdGFzZXQub25VcGRhdGUgPSBbXTtcblxuICAgIERhdGFzZXQudXBkYXRlID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgdmFyIHVwZGF0ZVByb21pc2U7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX0NIQU5HRSwgZGF0YXNldC5uYW1lKTtcblxuICAgICAgaWYgKGRhdGFzZXQudmFsdWVzKSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSAkcShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gICAgICAgICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YXNldC52YWx1ZXMpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gJGh0dHAuZ2V0KGRhdGFzZXQudXJsLCB7Y2FjaGU6IHRydWV9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgdmFyIGRhdGE7XG5cbiAgICAgICAgICAvLyBmaXJzdCBzZWUgd2hldGhlciB0aGUgZGF0YSBpcyBKU09OLCBvdGhlcndpc2UgdHJ5IHRvIHBhcnNlIENTVlxuICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2pzb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZGwucmVhZChyZXNwb25zZS5kYXRhLCB7dHlwZTogJ2Nzdid9KTtcbiAgICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdjc3YnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBEYXRhc2V0Lm9uVXBkYXRlLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9IHVwZGF0ZVByb21pc2UudGhlbihsaXN0ZW5lcik7XG4gICAgICB9KTtcblxuICAgICAgLy8gQ29weSB0aGUgZGF0YXNldCBpbnRvIHRoZSBjb25maWcgc2VydmljZSBvbmNlIGl0IGlzIHJlYWR5XG4gICAgICB1cGRhdGVQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIENvbmZpZy51cGRhdGVEYXRhc2V0KGRhdGFzZXQsIERhdGFzZXQudHlwZSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHVwZGF0ZVByb21pc2U7XG4gICAgfTtcblxuICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEgPSBmdW5jdGlvbihkYXRhc2V0LCBkYXRhKSB7XG4gICAgICBEYXRhc2V0LmRhdGEgPSBkYXRhO1xuXG4gICAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gZGF0YXNldDtcbiAgICAgIERhdGFzZXQuc3RhdHMgPSB2bC5kYXRhLnN0YXRzKERhdGFzZXQuZGF0YSk7XG5cbiAgICAgIGZvciAodmFyIGZpZWxkTmFtZSBpbiBEYXRhc2V0LnN0YXRzKSB7XG4gICAgICAgIGlmIChmaWVsZE5hbWUgIT09ICcqJykge1xuICAgICAgICAgIERhdGFzZXQuc3RhdHNbZmllbGROYW1lXS5zYW1wbGUgPSBfLnNhbXBsZShfLnBsdWNrKERhdGFzZXQuZGF0YSwgZmllbGROYW1lKSwgNyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgRGF0YXNldC5kYXRhc2NoZW1hID0gRGF0YXNldC5nZXRTY2hlbWEoRGF0YXNldC5kYXRhLCBEYXRhc2V0LnN0YXRzKTtcbiAgICAgIERhdGFzZXQuZGF0YXNjaGVtYS5ieU5hbWUgPSBnZXROYW1lTWFwKERhdGFzZXQuZGF0YXNjaGVtYSk7XG4gICAgfTtcblxuICAgIERhdGFzZXQuYWRkID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgaWYgKCFkYXRhc2V0LmlkKSB7XG4gICAgICAgIGRhdGFzZXQuaWQgPSBkYXRhc2V0LnVybDtcbiAgICAgIH1cbiAgICAgIGRhdGFzZXRzLnB1c2goZGF0YXNldCk7XG5cbiAgICAgIHJldHVybiBkYXRhc2V0O1xuICAgIH07XG5cbiAgICByZXR1cm4gRGF0YXNldDtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZGF0YXNldE1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZGF0YXNldE1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldE1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiBmYWxzZVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2RhdGFzZXRTZWxlY3RvcicsIGZ1bmN0aW9uKERhdGFzZXQsIE1vZGFscywgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7fSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG5cbiAgICAgICAgc2NvcGUuZGF0YXNldENoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoIURhdGFzZXQuZGF0YXNldCkge1xuICAgICAgICAgICAgLy8gcmVzZXQgaWYgbm8gZGF0YXNldCBoYXMgYmVlbiBzZXRcbiAgICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuY3VycmVudERhdGFzZXQ7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9PUEVOKTtcbiAgICAgICAgICAgIE1vZGFscy5vcGVuKCdkYXRhc2V0LW1vZGFsJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpmaWxlRHJvcHpvbmVcbiAqIEBkZXNjcmlwdGlvblxuICogIyBmaWxlRHJvcHpvbmVcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAvLyBBZGQgdGhlIGZpbGUgcmVhZGVyIGFzIGEgbmFtZWQgZGVwZW5kZW5jeVxuICAuY29uc3RhbnQoJ0ZpbGVSZWFkZXInLCB3aW5kb3cuRmlsZVJlYWRlcilcbiAgLmRpcmVjdGl2ZSgnZmlsZURyb3B6b25lJywgZnVuY3Rpb24gKE1vZGFscywgQWxlcnRzLCBGaWxlUmVhZGVyKSB7XG5cbiAgICAvLyBIZWxwZXIgbWV0aG9kc1xuXG4gICAgZnVuY3Rpb24gaXNTaXplVmFsaWQoc2l6ZSwgbWF4U2l6ZSkge1xuICAgICAgLy8gU2l6ZSBpcyBwcm92aWRlZCBpbiBieXRlczsgbWF4U2l6ZSBpcyBwcm92aWRlZCBpbiBtZWdhYnl0ZXNcbiAgICAgIC8vIENvZXJjZSBtYXhTaXplIHRvIGEgbnVtYmVyIGluIGNhc2UgaXQgY29tZXMgaW4gYXMgYSBzdHJpbmdcbiAgICAgIGlmICghbWF4U2l6ZSB8fCBzaXplIC8gMTAyNCAvIDEwMjQgPCArbWF4U2l6ZSkge1xuICAgICAgICAvLyBtYXggZmlsZSBzaXplIHdhcyBub3Qgc3BlY2lmaWVkLCBpcyBlbXB0eSwgb3IgaXMgc3VmZmljaWVudGx5IGxhcmdlXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBBbGVydHMuYWRkKCdGaWxlIG11c3QgYmUgc21hbGxlciB0aGFuICcgKyBtYXhTaXplICsgJyBNQicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVHlwZVZhbGlkKHR5cGUsIHZhbGlkTWltZVR5cGVzKSB7XG4gICAgICBpZiAoIXZhbGlkTWltZVR5cGVzIHx8IHZhbGlkTWltZVR5cGVzLmluZGV4T2YodHlwZSkgPiAtMSkge1xuICAgICAgICAvLyBJZiBubyBtaW1lIHR5cGUgcmVzdHJpY3Rpb25zIHdlcmUgcHJvdmlkZWQsIG9yIHRoZSBwcm92aWRlZCBmaWxlJ3NcbiAgICAgICAgLy8gdHlwZSBpcyB3aGl0ZWxpc3RlZCwgdHlwZSBpcyB2YWxpZFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIEFsZXJ0cy5hZGQoJ0ludmFsaWQgZmlsZSB0eXBlLiBGaWxlIG11c3QgYmUgb25lIG9mIGZvbGxvd2luZyB0eXBlczogJyArIHZhbGlkTWltZVR5cGVzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2ZpbGVkcm9wem9uZS5odG1sJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgLy8gUGVybWl0IGFyYml0cmFyeSBjaGlsZCBjb250ZW50XG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgbWF4RmlsZVNpemU6ICdAJyxcbiAgICAgICAgdmFsaWRNaW1lVHlwZXM6ICdAJyxcbiAgICAgICAgLy8gRXhwb3NlIHRoaXMgZGlyZWN0aXZlJ3MgZGF0YXNldCBwcm9wZXJ0eSB0byBwYXJlbnQgc2NvcGVzIHRocm91Z2hcbiAgICAgICAgLy8gdHdvLXdheSBkYXRhYmluZGluZ1xuICAgICAgICBkYXRhc2V0OiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQvKiwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5kYXRhc2V0ID0gc2NvcGUuZGF0YXNldCB8fCB7fTtcblxuICAgICAgICBlbGVtZW50Lm9uKCdkcmFnb3ZlciBkcmFnZW50ZXInLCBmdW5jdGlvbiBvbkRyYWdFbnRlcihldmVudCkge1xuICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZXZlbnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9ICdjb3B5JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gcmVhZEZpbGUoZmlsZSkge1xuICAgICAgICAgIGlmICghaXNUeXBlVmFsaWQoZmlsZS50eXBlLCBzY29wZS52YWxpZE1pbWVUeXBlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpc1NpemVWYWxpZChmaWxlLnNpemUsIHNjb3BlLm1heEZpbGVTaXplKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBzY29wZS4kYXBwbHkoZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5kYXRhID0gZXZ0LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFN0cmlwIGZpbGUgbmFtZSBleHRlbnNpb25zIGZyb20gdGhlIHVwbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5uYW1lID0gZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlxcdyskLywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBBbGVydHMuYWRkKCdFcnJvciByZWFkaW5nIGZpbGUnKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50Lm9uKCdkcm9wJywgZnVuY3Rpb24gb25Ecm9wKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlYWRGaWxlKGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzWzBdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZWxlbWVudC5maW5kKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiBvblVwbG9hZCgvKmV2ZW50Ki8pIHtcbiAgICAgICAgICAvLyBcInRoaXNcIiBpcyB0aGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgIHJlYWRGaWxlKHRoaXMuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnBhc3RlRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHBhc3RlRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3Bhc3RlRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBBbGVydHMsIExvZ2dlciwgQ29uZmlnLCBfLCBkbCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvcGFzdGVkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5kYXRhc2V0ID0ge1xuICAgICAgICAgIG5hbWU6ICcnLFxuICAgICAgICAgIGRhdGE6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkYXRhID0gZGwucmVhZChzY29wZS5kYXRhc2V0LmRhdGEsIHtcbiAgICAgICAgICAgIHR5cGU6ICdjc3YnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgcGFzdGVkRGF0YXNldCA9IHtcbiAgICAgICAgICAgIGlkOiBEYXRlLm5vdygpLCAgLy8gdGltZSBhcyBpZFxuICAgICAgICAgICAgbmFtZTogc2NvcGUuZGF0YXNldC5uYW1lLFxuICAgICAgICAgICAgdmFsdWVzOiBkYXRhLFxuICAgICAgICAgICAgZ3JvdXA6ICdwYXN0ZWQnXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIExvZyB0aGF0IHdlIGhhdmUgcGFzdGVkIGRhdGFcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9ORVdfUEFTVEUsIHBhc3RlZERhdGFzZXQubmFtZSk7XG5cbiAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgcGFzdGVkIGRhdGEgYXMgYSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKHBhc3RlZERhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIG5ld2x5LXJlZ2lzdGVyZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBDbG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGNvbnRhaW5pbmcgbW9kYWxcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgndmx1aScpLmNvbnN0YW50KCdTYW1wbGVEYXRhJywgW3tcbiAgbmFtZTogJ0JhcmxleScsXG4gIHVybDogJ2RhdGEvYmFybGV5Lmpzb24nLFxuICBpZDogJ2JhcmxleScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYXJzJyxcbiAgdXJsOiAnZGF0YS9jYXJzLmpzb24nLFxuICBpZDogJ2NhcnMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ3JpbWVhJyxcbiAgdXJsOiAnZGF0YS9jcmltZWEuanNvbicsXG4gIGlkOiAnY3JpbWVhJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0RyaXZpbmcnLFxuICB1cmw6ICdkYXRhL2RyaXZpbmcuanNvbicsXG4gIGlkOiAnZHJpdmluZycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdJcmlzJyxcbiAgdXJsOiAnZGF0YS9pcmlzLmpzb24nLFxuICBpZDogJ2lyaXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnSm9icycsXG4gIHVybDogJ2RhdGEvam9icy5qc29uJyxcbiAgaWQ6ICdqb2JzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ1BvcHVsYXRpb24nLFxuICB1cmw6ICdkYXRhL3BvcHVsYXRpb24uanNvbicsXG4gIGlkOiAncG9wdWxhdGlvbicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdNb3ZpZXMnLFxuICB1cmw6ICdkYXRhL21vdmllcy5qc29uJyxcbiAgaWQ6ICdtb3ZpZXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQmlyZHN0cmlrZXMnLFxuICB1cmw6ICdkYXRhL2JpcmRzdHJpa2VzLmpzb24nLFxuICBpZDogJ2JpcmRzdHJpa2VzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0J1cnRpbicsXG4gIHVybDogJ2RhdGEvYnVydGluLmpzb24nLFxuICBpZDogJ2J1cnRpbicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCdWRnZXQgMjAxNicsXG4gIHVybDogJ2RhdGEvYnVkZ2V0Lmpzb24nLFxuICBpZDogJ2J1ZGdldCcsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDbGltYXRlIE5vcm1hbHMnLFxuICB1cmw6ICdkYXRhL2NsaW1hdGUuanNvbicsXG4gIGlkOiAnY2xpbWF0ZScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYW1wYWlnbnMnLFxuICB1cmw6ICdkYXRhL3dlYmFsbDI2Lmpzb24nLFxuICBpZDogJ3dlYmFsbDI2JyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmllbGRJbmZvXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmllbGRJbmZvXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZmllbGRJbmZvJywgZnVuY3Rpb24gKERhdGFzZXQsIERyb3AsIHZsLCBjb25zdHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdmaWVsZGluZm8vZmllbGRpbmZvLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZDogJz0nLFxuICAgICAgICBzaG93VHlwZTogJz0nLFxuICAgICAgICBzaG93SW5mbzogJz0nLFxuICAgICAgICBzaG93Q2FyZXQ6ICc9JyxcbiAgICAgICAgcG9wdXBDb250ZW50OiAnPScsXG4gICAgICAgIHNob3dSZW1vdmU6ICc9JyxcbiAgICAgICAgcmVtb3ZlQWN0aW9uOiAnJicsXG4gICAgICAgIGFjdGlvbjogJyYnLFxuICAgICAgICBkaXNhYmxlQ291bnRDYXJldDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZ1bmNzUG9wdXA7XG5cbiAgICAgICAgc2NvcGUudHlwZU5hbWVzID0gY29uc3RzLnR5cGVOYW1lcztcbiAgICAgICAgc2NvcGUuc3RhdHMgPSBEYXRhc2V0LnN0YXRzW3Njb3BlLmZpZWxkLm5hbWVdO1xuICAgICAgICBzY29wZS5pc1R5cGVzID0gdmwuZmllbGQuaXNUeXBlcztcblxuICAgICAgICBzd2l0Y2goc2NvcGUuZmllbGQudHlwZSl7XG4gICAgICAgICAgY2FzZSAnTyc6XG4gICAgICAgICAgICBzY29wZS5pY29uID0gJ2ZhLWZvbnQnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnTic6XG4gICAgICAgICAgICBzY29wZS5pY29uID0gJ2ZhLWZvbnQnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICBzY29wZS5pY29uID0gJ2ljb24taGFzaCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdUJzpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnZmEtY2FsZW5kYXInO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS5jbGlja2VkID0gZnVuY3Rpb24oJGV2ZW50KXtcbiAgICAgICAgICBpZihzY29wZS5hY3Rpb24gJiYgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCcuZmEtY2FyZXQtZG93bicpWzBdICYmXG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJ3NwYW4udHlwZScpWzBdKSB7XG4gICAgICAgICAgICBzY29wZS5hY3Rpb24oJGV2ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZnVuYyA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgICAgcmV0dXJuIGZpZWxkLmFnZ3JlZ2F0ZSB8fCBmaWVsZC50aW1lVW5pdCB8fFxuICAgICAgICAgICAgKGZpZWxkLmJpbiAmJiAnYmluJykgfHxcbiAgICAgICAgICAgIGZpZWxkLl9hZ2dyZWdhdGUgfHwgZmllbGQuX3RpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGQuX2JpbiAmJiAnYmluJykgfHwgKGZpZWxkLl9hbnkgJiYgJ2F1dG8nKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ3BvcHVwQ29udGVudCcsIGZ1bmN0aW9uKHBvcHVwQ29udGVudCkge1xuICAgICAgICAgIGlmICghcG9wdXBDb250ZW50KSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgaWYgKGZ1bmNzUG9wdXApIHtcbiAgICAgICAgICAgIGZ1bmNzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmNzUG9wdXAgPSBuZXcgRHJvcCh7XG4gICAgICAgICAgICBjb250ZW50OiBwb3B1cENvbnRlbnQsXG4gICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnQuZmluZCgnLnR5cGUtY2FyZXQnKVswXSxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tIGxlZnQnLFxuICAgICAgICAgICAgb3Blbk9uOiAnY2xpY2snXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCkge1xuICAgICAgICAgICAgZnVuY3NQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmxvZ2dlclxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGxvZ2dlclxuICogU2VydmljZSBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdMb2dnZXInLCBmdW5jdGlvbiAoJGxvY2F0aW9uLCAkd2luZG93LCBjb25zdHMsIEFuYWx5dGljcykge1xuXG4gICAgdmFyIHNlcnZpY2UgPSB7fTtcblxuICAgIHNlcnZpY2UubGV2ZWxzID0ge1xuICAgICAgT0ZGOiB7aWQ6J09GRicsIHJhbms6MH0sXG4gICAgICBUUkFDRToge2lkOidUUkFDRScsIHJhbms6MX0sXG4gICAgICBERUJVRzoge2lkOidERUJVRycsIHJhbms6Mn0sXG4gICAgICBJTkZPOiB7aWQ6J0lORk8nLCByYW5rOjN9LFxuICAgICAgV0FSTjoge2lkOidXQVJOJywgcmFuazo0fSxcbiAgICAgIEVSUk9SOiB7aWQ6J0VSUk9SJywgcmFuazo1fSxcbiAgICAgIEZBVEFMOiB7aWQ6J0ZBVEFMJywgcmFuazo2fVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmFjdGlvbnMgPSB7XG4gICAgICAvLyBEQVRBXG4gICAgICBJTklUSUFMSVpFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdJTklUSUFMSVpFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIFVORE86IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ1VORE8nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBSRURPOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdSRURPJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9DSEFOR0U6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9PUEVOOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX09QRU4nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX05FV19QQVNURToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9ORVdfUEFTVEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX05FV19VUkw6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfTkVXX1VSTCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIEJPT0tNQVJLXG4gICAgICBCT09LTUFSS19BREQ6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX0FERCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX1JFTU9WRToge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfUkVNT1ZFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfT1BFTjoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX0NMT1NFOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19DTE9TRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX0NMRUFSOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOiAnQk9PS01BUktfQ0xFQVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICAvLyBDSEFSVFxuICAgICAgQ0hBUlRfTU9VU0VPVkVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9NT1VTRU9WRVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfTU9VU0VPVVQ6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1VUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX1JFTkRFUjoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfUkVOREVSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX0VYUE9TRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfRVhQT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX1RPT0xUSVA6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX1RPT0xUSVAnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUF9FTkQ6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX1RPT0xUSVBfRU5EJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcblxuICAgICAgU09SVF9UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J1NPUlRfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTUFSS1RZUEVfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidNQVJLVFlQRV9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX09QRU46IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0RSSUxMX0RPV05fT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fQ0xPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdEUklMTF9ET1dOX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9HX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0xPR19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUUkFOU1BPU0VfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnVFJBTlNQT1NFX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE5VTExfRklMVEVSX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTlVMTF9GSUxURVJfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICBDTFVTVEVSX1NFTEVDVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0xVU1RFUl9TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0FEX01PUkU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0xPQURfTU9SRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gRklFTERTXG4gICAgICBGSUVMRFNfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZJRUxEU19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUVMRFNfUkVTRVQ6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX1JFU0VUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRlVOQ19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRlVOQ19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vUE9MRVNUQVJcbiAgICAgIFNQRUNfQ0hBTkdFOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBGSUVMRF9EUk9QOiB7Y2F0ZWdvcnk6ICdQT0xFU1RBUicsIGlkOiAnRklFTERfRFJPUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBNQVJLX0NIQU5HRToge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ01BUktfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uLCBsYWJlbCwgZGF0YSkge1xuICAgICAgaWYgKCFjb25zdHMubG9nZ2luZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgdmFsdWUgPSBkYXRhID8gZGF0YS52YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICAgIGlmKGFjdGlvbi5sZXZlbC5yYW5rID49IHNlcnZpY2UubGV2ZWxzLklORk8ucmFuaykge1xuICAgICAgICBBbmFseXRpY3MudHJhY2tFdmVudChhY3Rpb24uY2F0ZWdvcnksIGFjdGlvbi5pZCwgbGFiZWwsIHZhbHVlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ1tMb2dnaW5nXSAnLCBhY3Rpb24uaWQsIGxhYmVsLCBkYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbihzZXJ2aWNlLmFjdGlvbnMuSU5JVElBTElaRSwgY29uc3RzLmFwcElkKTtcblxuICAgIHJldHVybiBzZXJ2aWNlO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWwnLCBmdW5jdGlvbiAoTW9kYWxzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnbW9kYWwvbW9kYWwuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIG1heFdpZHRoOiAnQCdcbiAgICAgIH0sXG4gICAgICAvLyBQcm92aWRlIGFuIGludGVyZmFjZSBmb3IgY2hpbGQgZGlyZWN0aXZlcyB0byBjbG9zZSB0aGlzIG1vZGFsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgdmFyIG1vZGFsSWQgPSBhdHRycy5pZDtcblxuICAgICAgICBzY29wZS53cmFwcGVyU3R5bGUgPSAnbWF4LXdpZHRoOicgKyBzY29wZS5tYXhXaWR0aDtcblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGNsb3NlZFxuICAgICAgICBzY29wZS5pc09wZW4gPSBmYWxzZTtcblxuICAgICAgICAvLyBSZWdpc3RlciB0aGlzIG1vZGFsIHdpdGggdGhlIHNlcnZpY2VcbiAgICAgICAgTW9kYWxzLnJlZ2lzdGVyKG1vZGFsSWQsIHNjb3BlKTtcbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIE1vZGFscy5kZXJlZ2lzdGVyKG1vZGFsSWQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbENsb3NlQnV0dG9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbW9kYWxDbG9zZUJ1dHRvblxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ21vZGFsQ2xvc2VCdXR0b24nLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdtb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXm1vZGFsJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgICdjbG9zZUNhbGxiYWNrJzogJyZvbkNsb3NlJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIHNjb3BlLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICBpZiAoc2NvcGUuY2xvc2VDYWxsYmFjaykge1xuICAgICAgICAgICAgc2NvcGUuY2xvc2VDYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Nb2RhbHNcbiAqIEBkZXNjcmlwdGlvblxuICogIyBNb2RhbHNcbiAqIFNlcnZpY2UgdXNlZCB0byBjb250cm9sIG1vZGFsIHZpc2liaWxpdHkgZnJvbSBhbnl3aGVyZSBpbiB0aGUgYXBwbGljYXRpb25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnTW9kYWxzJywgZnVuY3Rpb24gKCRjYWNoZUZhY3RvcnkpIHtcblxuICAgIC8vIFRPRE86IFRoZSB1c2Ugb2Ygc2NvcGUgaGVyZSBhcyB0aGUgbWV0aG9kIGJ5IHdoaWNoIGEgbW9kYWwgZGlyZWN0aXZlXG4gICAgLy8gaXMgcmVnaXN0ZXJlZCBhbmQgY29udHJvbGxlZCBtYXkgbmVlZCB0byBjaGFuZ2UgdG8gc3VwcG9ydCByZXRyaWV2aW5nXG4gICAgLy8gZGF0YSBmcm9tIGEgbW9kYWwgYXMgbWF5IGJlIG5lZWRlZCBpbiAjNzdcbiAgICB2YXIgbW9kYWxzQ2FjaGUgPSAkY2FjaGVGYWN0b3J5KCdtb2RhbHMnKTtcblxuICAgIC8vIFB1YmxpYyBBUElcbiAgICByZXR1cm4ge1xuICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkLCBzY29wZSkge1xuICAgICAgICBpZiAobW9kYWxzQ2FjaGUuZ2V0KGlkKSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Nhbm5vdCByZWdpc3RlciB0d28gbW9kYWxzIHdpdGggaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxzQ2FjaGUucHV0KGlkLCBzY29wZSk7XG4gICAgICB9LFxuXG4gICAgICBkZXJlZ2lzdGVyOiBmdW5jdGlvbihpZCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLy8gT3BlbiBhIG1vZGFsXG4gICAgICBvcGVuOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IHRydWU7XG4gICAgICB9LFxuXG4gICAgICAvLyBDbG9zZSBhIG1vZGFsXG4gICAgICBjbG9zZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgIH0sXG5cbiAgICAgIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlQWxsKCk7XG4gICAgICB9LFxuXG4gICAgICBjb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2RhbHNDYWNoZS5pbmZvKCkuc2l6ZTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIi8qIVxuICogSlNPTjMgd2l0aCBjb21wYWN0IHN0cmluZ2lmeSAtLSBNb2RpZmllZCBieSBLYW5pdCBXb25nc3VwaGFzYXdhdC4gICBodHRwczovL2dpdGh1Yi5jb20va2FuaXR3L2pzb24zXG4gKlxuICogRm9ya2VkIGZyb20gSlNPTiB2My4zLjIgfCBodHRwczovL2Jlc3RpZWpzLmdpdGh1Yi5pby9qc29uMyB8IENvcHlyaWdodCAyMDEyLTIwMTQsIEtpdCBDYW1icmlkZ2UgfCBodHRwOi8va2l0Lm1pdC1saWNlbnNlLm9yZ1xuICovXG47KGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IHRoZSBgZGVmaW5lYCBmdW5jdGlvbiBleHBvc2VkIGJ5IGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy4gVGhlXG4gIC8vIHN0cmljdCBgZGVmaW5lYCBjaGVjayBpcyBuZWNlc3NhcnkgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBgci5qc2AuXG4gIHZhciBpc0xvYWRlciA9IHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kO1xuXG4gIC8vIEEgc2V0IG9mIHR5cGVzIHVzZWQgdG8gZGlzdGluZ3Vpc2ggb2JqZWN0cyBmcm9tIHByaW1pdGl2ZXMuXG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICBcImZ1bmN0aW9uXCI6IHRydWUsXG4gICAgXCJvYmplY3RcIjogdHJ1ZVxuICB9O1xuXG4gIC8vIERldGVjdCB0aGUgYGV4cG9ydHNgIG9iamVjdCBleHBvc2VkIGJ5IENvbW1vbkpTIGltcGxlbWVudGF0aW9ucy5cbiAgdmFyIGZyZWVFeHBvcnRzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblxuICAvLyBVc2UgdGhlIGBnbG9iYWxgIG9iamVjdCBleHBvc2VkIGJ5IE5vZGUgKGluY2x1ZGluZyBCcm93c2VyaWZ5IHZpYVxuICAvLyBgaW5zZXJ0LW1vZHVsZS1nbG9iYWxzYCksIE5hcndoYWwsIGFuZCBSaW5nbyBhcyB0aGUgZGVmYXVsdCBjb250ZXh0LFxuICAvLyBhbmQgdGhlIGB3aW5kb3dgIG9iamVjdCBpbiBicm93c2Vycy4gUmhpbm8gZXhwb3J0cyBhIGBnbG9iYWxgIGZ1bmN0aW9uXG4gIC8vIGluc3RlYWQuXG4gIHZhciByb290ID0gb2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93IHx8IHRoaXMsXG4gICAgICBmcmVlR2xvYmFsID0gZnJlZUV4cG9ydHMgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgdHlwZW9mIGdsb2JhbCA9PSBcIm9iamVjdFwiICYmIGdsb2JhbDtcblxuICBpZiAoZnJlZUdsb2JhbCAmJiAoZnJlZUdsb2JhbFtcImdsb2JhbFwiXSA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsW1wid2luZG93XCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJzZWxmXCJdID09PSBmcmVlR2xvYmFsKSkge1xuICAgIHJvb3QgPSBmcmVlR2xvYmFsO1xuICB9XG5cbiAgLy8gUHVibGljOiBJbml0aWFsaXplcyBKU09OIDMgdXNpbmcgdGhlIGdpdmVuIGBjb250ZXh0YCBvYmplY3QsIGF0dGFjaGluZyB0aGVcbiAgLy8gYHN0cmluZ2lmeWAgYW5kIGBwYXJzZWAgZnVuY3Rpb25zIHRvIHRoZSBzcGVjaWZpZWQgYGV4cG9ydHNgIG9iamVjdC5cbiAgZnVuY3Rpb24gcnVuSW5Db250ZXh0KGNvbnRleHQsIGV4cG9ydHMpIHtcbiAgICBjb250ZXh0IHx8IChjb250ZXh0ID0gcm9vdFtcIk9iamVjdFwiXSgpKTtcbiAgICBleHBvcnRzIHx8IChleHBvcnRzID0gcm9vdFtcIk9iamVjdFwiXSgpKTtcblxuICAgIC8vIE5hdGl2ZSBjb25zdHJ1Y3RvciBhbGlhc2VzLlxuICAgIHZhciBOdW1iZXIgPSBjb250ZXh0W1wiTnVtYmVyXCJdIHx8IHJvb3RbXCJOdW1iZXJcIl0sXG4gICAgICAgIFN0cmluZyA9IGNvbnRleHRbXCJTdHJpbmdcIl0gfHwgcm9vdFtcIlN0cmluZ1wiXSxcbiAgICAgICAgT2JqZWN0ID0gY29udGV4dFtcIk9iamVjdFwiXSB8fCByb290W1wiT2JqZWN0XCJdLFxuICAgICAgICBEYXRlID0gY29udGV4dFtcIkRhdGVcIl0gfHwgcm9vdFtcIkRhdGVcIl0sXG4gICAgICAgIFN5bnRheEVycm9yID0gY29udGV4dFtcIlN5bnRheEVycm9yXCJdIHx8IHJvb3RbXCJTeW50YXhFcnJvclwiXSxcbiAgICAgICAgVHlwZUVycm9yID0gY29udGV4dFtcIlR5cGVFcnJvclwiXSB8fCByb290W1wiVHlwZUVycm9yXCJdLFxuICAgICAgICBNYXRoID0gY29udGV4dFtcIk1hdGhcIl0gfHwgcm9vdFtcIk1hdGhcIl0sXG4gICAgICAgIG5hdGl2ZUpTT04gPSBjb250ZXh0W1wiSlNPTlwiXSB8fCByb290W1wiSlNPTlwiXTtcblxuICAgIC8vIERlbGVnYXRlIHRvIHRoZSBuYXRpdmUgYHN0cmluZ2lmeWAgYW5kIGBwYXJzZWAgaW1wbGVtZW50YXRpb25zLlxuICAgIGlmICh0eXBlb2YgbmF0aXZlSlNPTiA9PSBcIm9iamVjdFwiICYmIG5hdGl2ZUpTT04pIHtcbiAgICAgIGV4cG9ydHMuc3RyaW5naWZ5ID0gbmF0aXZlSlNPTi5zdHJpbmdpZnk7XG4gICAgICBleHBvcnRzLnBhcnNlID0gbmF0aXZlSlNPTi5wYXJzZTtcbiAgICB9XG5cbiAgICAvLyBDb252ZW5pZW5jZSBhbGlhc2VzLlxuICAgIHZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGUsXG4gICAgICAgIGdldENsYXNzID0gb2JqZWN0UHJvdG8udG9TdHJpbmcsXG4gICAgICAgIGlzUHJvcGVydHksIGZvckVhY2gsIHVuZGVmO1xuXG4gICAgLy8gVGVzdCB0aGUgYERhdGUjZ2V0VVRDKmAgbWV0aG9kcy4gQmFzZWQgb24gd29yayBieSBAWWFmZmxlLlxuICAgIHZhciBpc0V4dGVuZGVkID0gbmV3IERhdGUoLTM1MDk4MjczMzQ1NzMyOTIpO1xuICAgIHRyeSB7XG4gICAgICAvLyBUaGUgYGdldFVUQ0Z1bGxZZWFyYCwgYE1vbnRoYCwgYW5kIGBEYXRlYCBtZXRob2RzIHJldHVybiBub25zZW5zaWNhbFxuICAgICAgLy8gcmVzdWx0cyBmb3IgY2VydGFpbiBkYXRlcyBpbiBPcGVyYSA+PSAxMC41My5cbiAgICAgIGlzRXh0ZW5kZWQgPSBpc0V4dGVuZGVkLmdldFVUQ0Z1bGxZZWFyKCkgPT0gLTEwOTI1MiAmJiBpc0V4dGVuZGVkLmdldFVUQ01vbnRoKCkgPT09IDAgJiYgaXNFeHRlbmRlZC5nZXRVVENEYXRlKCkgPT09IDEgJiZcbiAgICAgICAgLy8gU2FmYXJpIDwgMi4wLjIgc3RvcmVzIHRoZSBpbnRlcm5hbCBtaWxsaXNlY29uZCB0aW1lIHZhbHVlIGNvcnJlY3RseSxcbiAgICAgICAgLy8gYnV0IGNsaXBzIHRoZSB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGRhdGUgbWV0aG9kcyB0byB0aGUgcmFuZ2Ugb2ZcbiAgICAgICAgLy8gc2lnbmVkIDMyLWJpdCBpbnRlZ2VycyAoWy0yICoqIDMxLCAyICoqIDMxIC0gMV0pLlxuICAgICAgICBpc0V4dGVuZGVkLmdldFVUQ0hvdXJzKCkgPT0gMTAgJiYgaXNFeHRlbmRlZC5nZXRVVENNaW51dGVzKCkgPT0gMzcgJiYgaXNFeHRlbmRlZC5nZXRVVENTZWNvbmRzKCkgPT0gNiAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbGxpc2Vjb25kcygpID09IDcwODtcbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG5cbiAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBuYXRpdmUgYEpTT04uc3RyaW5naWZ5YCBhbmQgYHBhcnNlYFxuICAgIC8vIGltcGxlbWVudGF0aW9ucyBhcmUgc3BlYy1jb21wbGlhbnQuIEJhc2VkIG9uIHdvcmsgYnkgS2VuIFNueWRlci5cbiAgICBmdW5jdGlvbiBoYXMobmFtZSkge1xuICAgICAgaWYgKGhhc1tuYW1lXSAhPT0gdW5kZWYpIHtcbiAgICAgICAgLy8gUmV0dXJuIGNhY2hlZCBmZWF0dXJlIHRlc3QgcmVzdWx0LlxuICAgICAgICByZXR1cm4gaGFzW25hbWVdO1xuICAgICAgfVxuICAgICAgdmFyIGlzU3VwcG9ydGVkO1xuICAgICAgaWYgKG5hbWUgPT0gXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIikge1xuICAgICAgICAvLyBJRSA8PSA3IGRvZXNuJ3Qgc3VwcG9ydCBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgdXNpbmcgc3F1YXJlXG4gICAgICAgIC8vIGJyYWNrZXQgbm90YXRpb24uIElFIDggb25seSBzdXBwb3J0cyB0aGlzIGZvciBwcmltaXRpdmVzLlxuICAgICAgICBpc1N1cHBvcnRlZCA9IFwiYVwiWzBdICE9IFwiYVwiO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09IFwianNvblwiKSB7XG4gICAgICAgIC8vIEluZGljYXRlcyB3aGV0aGVyIGJvdGggYEpTT04uc3RyaW5naWZ5YCBhbmQgYEpTT04ucGFyc2VgIGFyZVxuICAgICAgICAvLyBzdXBwb3J0ZWQuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gaGFzKFwianNvbi1zdHJpbmdpZnlcIikgJiYgaGFzKFwianNvbi1wYXJzZVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB2YWx1ZSwgc2VyaWFsaXplZCA9ICd7XCJhXCI6WzEsdHJ1ZSxmYWxzZSxudWxsLFwiXFxcXHUwMDAwXFxcXGJcXFxcblxcXFxmXFxcXHJcXFxcdFwiXX0nO1xuICAgICAgICAvLyBUZXN0IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1zdHJpbmdpZnlcIikge1xuICAgICAgICAgIHZhciBzdHJpbmdpZnkgPSBleHBvcnRzLnN0cmluZ2lmeSwgc3RyaW5naWZ5U3VwcG9ydGVkID0gdHlwZW9mIHN0cmluZ2lmeSA9PSBcImZ1bmN0aW9uXCIgJiYgaXNFeHRlbmRlZDtcbiAgICAgICAgICBpZiAoc3RyaW5naWZ5U3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAvLyBBIHRlc3QgZnVuY3Rpb24gb2JqZWN0IHdpdGggYSBjdXN0b20gYHRvSlNPTmAgbWV0aG9kLlxuICAgICAgICAgICAgKHZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0pLnRvSlNPTiA9IHZhbHVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc3RyaW5naWZ5U3VwcG9ydGVkID1cbiAgICAgICAgICAgICAgICAvLyBGaXJlZm94IDMuMWIxIGFuZCBiMiBzZXJpYWxpemUgc3RyaW5nLCBudW1iZXIsIGFuZCBib29sZWFuXG4gICAgICAgICAgICAgICAgLy8gcHJpbWl0aXZlcyBhcyBvYmplY3QgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KDApID09PSBcIjBcIiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiwgYW5kIEpTT04gMiBzZXJpYWxpemUgd3JhcHBlZCBwcmltaXRpdmVzIGFzIG9iamVjdFxuICAgICAgICAgICAgICAgIC8vIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgTnVtYmVyKCkpID09PSBcIjBcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgU3RyaW5nKCkpID09ICdcIlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSB2YWx1ZSBpcyBgbnVsbGAsIGB1bmRlZmluZWRgLCBvclxuICAgICAgICAgICAgICAgIC8vIGRvZXMgbm90IGRlZmluZSBhIGNhbm9uaWNhbCBKU09OIHJlcHJlc2VudGF0aW9uICh0aGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggYHRvSlNPTmAgcHJvcGVydGllcyBhcyB3ZWxsLCAqdW5sZXNzKiB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgICAvLyB3aXRoaW4gYW4gb2JqZWN0IG9yIGFycmF5KS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoZ2V0Q2xhc3MpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIElFIDggc2VyaWFsaXplcyBgdW5kZWZpbmVkYCBhcyBgXCJ1bmRlZmluZWRcImAuIFNhZmFyaSA8PSA1LjEuNyBhbmRcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMyBwYXNzIHRoaXMgdGVzdC5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodW5kZWYpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNyBhbmQgRkYgMy4xYjMgdGhyb3cgYEVycm9yYHMgYW5kIGBUeXBlRXJyb3JgcyxcbiAgICAgICAgICAgICAgICAvLyByZXNwZWN0aXZlbHksIGlmIHRoZSB2YWx1ZSBpcyBvbWl0dGVkIGVudGlyZWx5LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSgpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBub3QgYSBudW1iZXIsXG4gICAgICAgICAgICAgICAgLy8gc3RyaW5nLCBhcnJheSwgb2JqZWN0LCBCb29sZWFuLCBvciBgbnVsbGAgbGl0ZXJhbC4gVGhpcyBhcHBsaWVzIHRvXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0cyB3aXRoIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzIGFzIHdlbGwsIHVubGVzcyB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgICAvLyBpbnNpZGUgb2JqZWN0IG9yIGFycmF5IGxpdGVyYWxzLiBZVUkgMy4wLjBiMSBpZ25vcmVzIGN1c3RvbSBgdG9KU09OYFxuICAgICAgICAgICAgICAgIC8vIG1ldGhvZHMgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3ZhbHVlXSkgPT0gXCJbMV1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBzZXJpYWxpemVzIGBbdW5kZWZpbmVkXWAgYXMgYFwiW11cImAgaW5zdGVhZCBvZlxuICAgICAgICAgICAgICAgIC8vIGBcIltudWxsXVwiYC5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmXSkgPT0gXCJbbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFlVSSAzLjAuMGIxIGZhaWxzIHRvIHNlcmlhbGl6ZSBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwpID09IFwibnVsbFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgaGFsdHMgc2VyaWFsaXphdGlvbiBpZiBhbiBhcnJheSBjb250YWlucyBhIGZ1bmN0aW9uOlxuICAgICAgICAgICAgICAgIC8vIGBbMSwgdHJ1ZSwgZ2V0Q2xhc3MsIDFdYCBzZXJpYWxpemVzIGFzIFwiWzEsdHJ1ZSxdLFwiLiBGRiAzLjFiM1xuICAgICAgICAgICAgICAgIC8vIGVsaWRlcyBub24tSlNPTiB2YWx1ZXMgZnJvbSBvYmplY3RzIGFuZCBhcnJheXMsIHVubGVzcyB0aGV5XG4gICAgICAgICAgICAgICAgLy8gZGVmaW5lIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWYsIGdldENsYXNzLCBudWxsXSkgPT0gXCJbbnVsbCxudWxsLG51bGxdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBTaW1wbGUgc2VyaWFsaXphdGlvbiB0ZXN0LiBGRiAzLjFiMSB1c2VzIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlc1xuICAgICAgICAgICAgICAgIC8vIHdoZXJlIGNoYXJhY3RlciBlc2NhcGUgY29kZXMgYXJlIGV4cGVjdGVkIChlLmcuLCBgXFxiYCA9PiBgXFx1MDAwOGApLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh7IFwiYVwiOiBbdmFsdWUsIHRydWUsIGZhbHNlLCBudWxsLCBcIlxceDAwXFxiXFxuXFxmXFxyXFx0XCJdIH0pID09IHNlcmlhbGl6ZWQgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSBhbmQgYjIgaWdub3JlIHRoZSBgZmlsdGVyYCBhbmQgYHdpZHRoYCBhcmd1bWVudHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwsIHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoWzEsIDJdLCBudWxsLCAxKSA9PSBcIltcXG4gMSxcXG4gMlxcbl1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIEpTT04gMiwgUHJvdG90eXBlIDw9IDEuNywgYW5kIG9sZGVyIFdlYktpdCBidWlsZHMgaW5jb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAvLyBzZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC04LjY0ZTE1KSkgPT0gJ1wiLTI3MTgyMS0wNC0yMFQwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gVGhlIG1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNSwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoOC42NGUxNSkpID09ICdcIisyNzU3NjAtMDktMTNUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggPD0gMTEuMCBpbmNvcnJlY3RseSBzZXJpYWxpemVzIHllYXJzIHByaW9yIHRvIDAgYXMgbmVnYXRpdmVcbiAgICAgICAgICAgICAgICAvLyBmb3VyLWRpZ2l0IHllYXJzIGluc3RlYWQgb2Ygc2l4LWRpZ2l0IHllYXJzLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtNjIxOTg3NTUyZTUpKSA9PSAnXCItMDAwMDAxLTAxLTAxVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjUgYW5kIE9wZXJhID49IDEwLjUzIGluY29ycmVjdGx5IHNlcmlhbGl6ZSBtaWxsaXNlY29uZFxuICAgICAgICAgICAgICAgIC8vIHZhbHVlcyBsZXNzIHRoYW4gMTAwMC4gQ3JlZGl0czogQFlhZmZsZS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTEpKSA9PSAnXCIxOTY5LTEyLTMxVDIzOjU5OjU5Ljk5OVpcIic7XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgc3RyaW5naWZ5U3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlzU3VwcG9ydGVkID0gc3RyaW5naWZ5U3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRlc3QgYEpTT04ucGFyc2VgLlxuICAgICAgICBpZiAobmFtZSA9PSBcImpzb24tcGFyc2VcIikge1xuICAgICAgICAgIHZhciBwYXJzZSA9IGV4cG9ydHMucGFyc2U7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwYXJzZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBhIGJhcmUgbGl0ZXJhbCBpcyBwcm92aWRlZC5cbiAgICAgICAgICAgICAgLy8gQ29uZm9ybWluZyBpbXBsZW1lbnRhdGlvbnMgc2hvdWxkIGFsc28gY29lcmNlIHRoZSBpbml0aWFsIGFyZ3VtZW50IHRvXG4gICAgICAgICAgICAgIC8vIGEgc3RyaW5nIHByaW9yIHRvIHBhcnNpbmcuXG4gICAgICAgICAgICAgIGlmIChwYXJzZShcIjBcIikgPT09IDAgJiYgIXBhcnNlKGZhbHNlKSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBwYXJzaW5nIHRlc3QuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBwYXJzZShzZXJpYWxpemVkKTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyc2VTdXBwb3J0ZWQgPSB2YWx1ZVtcImFcIl0ubGVuZ3RoID09IDUgJiYgdmFsdWVbXCJhXCJdWzBdID09PSAxO1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS4yIGFuZCBGRiAzLjFiMSBhbGxvdyB1bmVzY2FwZWQgdGFicyBpbiBzdHJpbmdzLlxuICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9ICFwYXJzZSgnXCJcXHRcIicpO1xuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wIGFuZCA0LjAuMSBhbGxvdyBsZWFkaW5nIGArYCBzaWducyBhbmQgbGVhZGluZ1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGRlY2ltYWwgcG9pbnRzLiBGRiA0LjAsIDQuMC4xLCBhbmQgSUUgOS0xMCBhbHNvIGFsbG93XG4gICAgICAgICAgICAgICAgICAgICAgLy8gY2VydGFpbiBvY3RhbCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMDFcIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZGIDQuMCwgNC4wLjEsIGFuZCBSaGlubyAxLjdSMy1SNCBhbGxvdyB0cmFpbGluZyBkZWNpbWFsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gcG9pbnRzLiBUaGVzZSBlbnZpcm9ubWVudHMsIGFsb25nIHdpdGggRkYgMy4xYjEgYW5kIDIsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyBhbGxvdyB0cmFpbGluZyBjb21tYXMgaW4gSlNPTiBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBwYXJzZShcIjEuXCIpICE9PSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBwYXJzZVN1cHBvcnRlZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc1tuYW1lXSA9ICEhaXNTdXBwb3J0ZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRydWUpIHsgLy8gdXNlZCB0byBiZSAhaGFzKFwianNvblwiKVxuICAgICAgLy8gQ29tbW9uIGBbW0NsYXNzXV1gIG5hbWUgYWxpYXNlcy5cbiAgICAgIHZhciBmdW5jdGlvbkNsYXNzID0gXCJbb2JqZWN0IEZ1bmN0aW9uXVwiLFxuICAgICAgICAgIGRhdGVDbGFzcyA9IFwiW29iamVjdCBEYXRlXVwiLFxuICAgICAgICAgIG51bWJlckNsYXNzID0gXCJbb2JqZWN0IE51bWJlcl1cIixcbiAgICAgICAgICBzdHJpbmdDbGFzcyA9IFwiW29iamVjdCBTdHJpbmddXCIsXG4gICAgICAgICAgYXJyYXlDbGFzcyA9IFwiW29iamVjdCBBcnJheV1cIixcbiAgICAgICAgICBib29sZWFuQ2xhc3MgPSBcIltvYmplY3QgQm9vbGVhbl1cIjtcblxuICAgICAgLy8gRGV0ZWN0IGluY29tcGxldGUgc3VwcG9ydCBmb3IgYWNjZXNzaW5nIHN0cmluZyBjaGFyYWN0ZXJzIGJ5IGluZGV4LlxuICAgICAgdmFyIGNoYXJJbmRleEJ1Z2d5ID0gaGFzKFwiYnVnLXN0cmluZy1jaGFyLWluZGV4XCIpO1xuXG4gICAgICAvLyBEZWZpbmUgYWRkaXRpb25hbCB1dGlsaXR5IG1ldGhvZHMgaWYgdGhlIGBEYXRlYCBtZXRob2RzIGFyZSBidWdneS5cbiAgICAgIGlmICghaXNFeHRlbmRlZCkge1xuICAgICAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgICAgICAvLyBBIG1hcHBpbmcgYmV0d2VlbiB0aGUgbW9udGhzIG9mIHRoZSB5ZWFyIGFuZCB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlblxuICAgICAgICAvLyBKYW51YXJ5IDFzdCBhbmQgdGhlIGZpcnN0IG9mIHRoZSByZXNwZWN0aXZlIG1vbnRoLlxuICAgICAgICB2YXIgTW9udGhzID0gWzAsIDMxLCA1OSwgOTAsIDEyMCwgMTUxLCAxODEsIDIxMiwgMjQzLCAyNzMsIDMwNCwgMzM0XTtcbiAgICAgICAgLy8gSW50ZXJuYWw6IENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW4gdGhlIFVuaXggZXBvY2ggYW5kIHRoZVxuICAgICAgICAvLyBmaXJzdCBkYXkgb2YgdGhlIGdpdmVuIG1vbnRoLlxuICAgICAgICB2YXIgZ2V0RGF5ID0gZnVuY3Rpb24gKHllYXIsIG1vbnRoKSB7XG4gICAgICAgICAgcmV0dXJuIE1vbnRoc1ttb250aF0gKyAzNjUgKiAoeWVhciAtIDE5NzApICsgZmxvb3IoKHllYXIgLSAxOTY5ICsgKG1vbnRoID0gKyhtb250aCA+IDEpKSkgLyA0KSAtIGZsb29yKCh5ZWFyIC0gMTkwMSArIG1vbnRoKSAvIDEwMCkgKyBmbG9vcigoeWVhciAtIDE2MDEgKyBtb250aCkgLyA0MDApO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyBpZiBhIHByb3BlcnR5IGlzIGEgZGlyZWN0IHByb3BlcnR5IG9mIHRoZSBnaXZlblxuICAgICAgLy8gb2JqZWN0LiBEZWxlZ2F0ZXMgdG8gdGhlIG5hdGl2ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBtZXRob2QuXG4gICAgICBpZiAoIShpc1Byb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHkpKSB7XG4gICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9LCBjb25zdHJ1Y3RvcjtcbiAgICAgICAgICBpZiAoKG1lbWJlcnMuX19wcm90b19fID0gbnVsbCwgbWVtYmVycy5fX3Byb3RvX18gPSB7XG4gICAgICAgICAgICAvLyBUaGUgKnByb3RvKiBwcm9wZXJ0eSBjYW5ub3QgYmUgc2V0IG11bHRpcGxlIHRpbWVzIGluIHJlY2VudFxuICAgICAgICAgICAgLy8gdmVyc2lvbnMgb2YgRmlyZWZveCBhbmQgU2VhTW9ua2V5LlxuICAgICAgICAgICAgXCJ0b1N0cmluZ1wiOiAxXG4gICAgICAgICAgfSwgbWVtYmVycykudG9TdHJpbmcgIT0gZ2V0Q2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuMyBkb2Vzbid0IGltcGxlbWVudCBgT2JqZWN0I2hhc093blByb3BlcnR5YCwgYnV0XG4gICAgICAgICAgICAvLyBzdXBwb3J0cyB0aGUgbXV0YWJsZSAqcHJvdG8qIHByb3BlcnR5LlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAvLyBDYXB0dXJlIGFuZCBicmVhayB0aGUgb2JqZWN0J3MgcHJvdG90eXBlIGNoYWluIChzZWUgc2VjdGlvbiA4LjYuMlxuICAgICAgICAgICAgICAvLyBvZiB0aGUgRVMgNS4xIHNwZWMpLiBUaGUgcGFyZW50aGVzaXplZCBleHByZXNzaW9uIHByZXZlbnRzIGFuXG4gICAgICAgICAgICAgIC8vIHVuc2FmZSB0cmFuc2Zvcm1hdGlvbiBieSB0aGUgQ2xvc3VyZSBDb21waWxlci5cbiAgICAgICAgICAgICAgdmFyIG9yaWdpbmFsID0gdGhpcy5fX3Byb3RvX18sIHJlc3VsdCA9IHByb3BlcnR5IGluICh0aGlzLl9fcHJvdG9fXyA9IG51bGwsIHRoaXMpO1xuICAgICAgICAgICAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCBwcm90b3R5cGUgY2hhaW4uXG4gICAgICAgICAgICAgIHRoaXMuX19wcm90b19fID0gb3JpZ2luYWw7XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDYXB0dXJlIGEgcmVmZXJlbmNlIHRvIHRoZSB0b3AtbGV2ZWwgYE9iamVjdGAgY29uc3RydWN0b3IuXG4gICAgICAgICAgICBjb25zdHJ1Y3RvciA9IG1lbWJlcnMuY29uc3RydWN0b3I7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgdG8gc2ltdWxhdGUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW5cbiAgICAgICAgICAgIC8vIG90aGVyIGVudmlyb25tZW50cy5cbiAgICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgdmFyIHBhcmVudCA9ICh0aGlzLmNvbnN0cnVjdG9yIHx8IGNvbnN0cnVjdG9yKS5wcm90b3R5cGU7XG4gICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eSBpbiB0aGlzICYmICEocHJvcGVydHkgaW4gcGFyZW50ICYmIHRoaXNbcHJvcGVydHldID09PSBwYXJlbnRbcHJvcGVydHldKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIG1lbWJlcnMgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBpc1Byb3BlcnR5LmNhbGwodGhpcywgcHJvcGVydHkpO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBJbnRlcm5hbDogTm9ybWFsaXplcyB0aGUgYGZvci4uLmluYCBpdGVyYXRpb24gYWxnb3JpdGhtIGFjcm9zc1xuICAgICAgLy8gZW52aXJvbm1lbnRzLiBFYWNoIGVudW1lcmF0ZWQga2V5IGlzIHlpZWxkZWQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzaXplID0gMCwgUHJvcGVydGllcywgbWVtYmVycywgcHJvcGVydHk7XG5cbiAgICAgICAgLy8gVGVzdHMgZm9yIGJ1Z3MgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQncyBgZm9yLi4uaW5gIGFsZ29yaXRobS4gVGhlXG4gICAgICAgIC8vIGB2YWx1ZU9mYCBwcm9wZXJ0eSBpbmhlcml0cyB0aGUgbm9uLWVudW1lcmFibGUgZmxhZyBmcm9tXG4gICAgICAgIC8vIGBPYmplY3QucHJvdG90eXBlYCBpbiBvbGRlciB2ZXJzaW9ucyBvZiBJRSwgTmV0c2NhcGUsIGFuZCBNb3ppbGxhLlxuICAgICAgICAoUHJvcGVydGllcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGlzLnZhbHVlT2YgPSAwO1xuICAgICAgICB9KS5wcm90b3R5cGUudmFsdWVPZiA9IDA7XG5cbiAgICAgICAgLy8gSXRlcmF0ZSBvdmVyIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBgUHJvcGVydGllc2AgY2xhc3MuXG4gICAgICAgIG1lbWJlcnMgPSBuZXcgUHJvcGVydGllcygpO1xuICAgICAgICBmb3IgKHByb3BlcnR5IGluIG1lbWJlcnMpIHtcbiAgICAgICAgICAvLyBJZ25vcmUgYWxsIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIGlmIChpc1Byb3BlcnR5LmNhbGwobWVtYmVycywgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFByb3BlcnRpZXMgPSBtZW1iZXJzID0gbnVsbDtcblxuICAgICAgICAvLyBOb3JtYWxpemUgdGhlIGl0ZXJhdGlvbiBhbGdvcml0aG0uXG4gICAgICAgIGlmICghc2l6ZSkge1xuICAgICAgICAgIC8vIEEgbGlzdCBvZiBub24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgICBtZW1iZXJzID0gW1widmFsdWVPZlwiLCBcInRvU3RyaW5nXCIsIFwidG9Mb2NhbGVTdHJpbmdcIiwgXCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLCBcImlzUHJvdG90eXBlT2ZcIiwgXCJoYXNPd25Qcm9wZXJ0eVwiLCBcImNvbnN0cnVjdG9yXCJdO1xuICAgICAgICAgIC8vIElFIDw9IDgsIE1vemlsbGEgMS4wLCBhbmQgTmV0c2NhcGUgNi4yIGlnbm9yZSBzaGFkb3dlZCBub24tZW51bWVyYWJsZVxuICAgICAgICAgIC8vIHByb3BlcnRpZXMuXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgbGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGhhc1Byb3BlcnR5ID0gIWlzRnVuY3Rpb24gJiYgdHlwZW9mIG9iamVjdC5jb25zdHJ1Y3RvciAhPSBcImZ1bmN0aW9uXCIgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIG9iamVjdC5oYXNPd25Qcm9wZXJ0eV0gJiYgb2JqZWN0Lmhhc093blByb3BlcnR5IHx8IGlzUHJvcGVydHk7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBHZWNrbyA8PSAxLjAgZW51bWVyYXRlcyB0aGUgYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIHVuZGVyXG4gICAgICAgICAgICAgIC8vIGNlcnRhaW4gY29uZGl0aW9uczsgSUUgZG9lcyBub3QuXG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgZWFjaCBub24tZW51bWVyYWJsZSBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGZvciAobGVuZ3RoID0gbWVtYmVycy5sZW5ndGg7IHByb3BlcnR5ID0gbWVtYmVyc1stLWxlbmd0aF07IGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgY2FsbGJhY2socHJvcGVydHkpKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHNpemUgPT0gMikge1xuICAgICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuNCBlbnVtZXJhdGVzIHNoYWRvd2VkIHByb3BlcnRpZXMgdHdpY2UuXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBzZXQgb2YgaXRlcmF0ZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHk7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBTdG9yZSBlYWNoIHByb3BlcnR5IG5hbWUgdG8gcHJldmVudCBkb3VibGUgZW51bWVyYXRpb24uIFRoZVxuICAgICAgICAgICAgICAvLyBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgaXMgbm90IGVudW1lcmF0ZWQgZHVlIHRvIGNyb3NzLVxuICAgICAgICAgICAgICAvLyBlbnZpcm9ubWVudCBpbmNvbnNpc3RlbmNpZXMuXG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgIWlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkgJiYgKG1lbWJlcnNbcHJvcGVydHldID0gMSkgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyBidWdzIGRldGVjdGVkOyB1c2UgdGhlIHN0YW5kYXJkIGBmb3IuLi5pbmAgYWxnb3JpdGhtLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHksIGlzQ29uc3RydWN0b3I7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiAhKGlzQ29uc3RydWN0b3IgPSBwcm9wZXJ0eSA9PT0gXCJjb25zdHJ1Y3RvclwiKSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgZHVlIHRvXG4gICAgICAgICAgICAvLyBjcm9zcy1lbnZpcm9ubWVudCBpbmNvbnNpc3RlbmNpZXMuXG4gICAgICAgICAgICBpZiAoaXNDb25zdHJ1Y3RvciB8fCBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCAocHJvcGVydHkgPSBcImNvbnN0cnVjdG9yXCIpKSkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9yRWFjaChvYmplY3QsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFB1YmxpYzogU2VyaWFsaXplcyBhIEphdmFTY3JpcHQgYHZhbHVlYCBhcyBhIEpTT04gc3RyaW5nLiBUaGUgb3B0aW9uYWxcbiAgICAgIC8vIGBmaWx0ZXJgIGFyZ3VtZW50IG1heSBzcGVjaWZ5IGVpdGhlciBhIGZ1bmN0aW9uIHRoYXQgYWx0ZXJzIGhvdyBvYmplY3QgYW5kXG4gICAgICAvLyBhcnJheSBtZW1iZXJzIGFyZSBzZXJpYWxpemVkLCBvciBhbiBhcnJheSBvZiBzdHJpbmdzIGFuZCBudW1iZXJzIHRoYXRcbiAgICAgIC8vIGluZGljYXRlcyB3aGljaCBwcm9wZXJ0aWVzIHNob3VsZCBiZSBzZXJpYWxpemVkLiBUaGUgb3B0aW9uYWwgYHdpZHRoYFxuICAgICAgLy8gYXJndW1lbnQgbWF5IGJlIGVpdGhlciBhIHN0cmluZyBvciBudW1iZXIgdGhhdCBzcGVjaWZpZXMgdGhlIGluZGVudGF0aW9uXG4gICAgICAvLyBsZXZlbCBvZiB0aGUgb3V0cHV0LlxuICAgICAgaWYgKHRydWUpIHtcbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIEVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFxcXFxcIixcbiAgICAgICAgICAzNDogJ1xcXFxcIicsXG4gICAgICAgICAgODogXCJcXFxcYlwiLFxuICAgICAgICAgIDEyOiBcIlxcXFxmXCIsXG4gICAgICAgICAgMTA6IFwiXFxcXG5cIixcbiAgICAgICAgICAxMzogXCJcXFxcclwiLFxuICAgICAgICAgIDk6IFwiXFxcXHRcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBDb252ZXJ0cyBgdmFsdWVgIGludG8gYSB6ZXJvLXBhZGRlZCBzdHJpbmcgc3VjaCB0aGF0IGl0c1xuICAgICAgICAvLyBsZW5ndGggaXMgYXQgbGVhc3QgZXF1YWwgdG8gYHdpZHRoYC4gVGhlIGB3aWR0aGAgbXVzdCBiZSA8PSA2LlxuICAgICAgICB2YXIgbGVhZGluZ1plcm9lcyA9IFwiMDAwMDAwXCI7XG4gICAgICAgIHZhciB0b1BhZGRlZFN0cmluZyA9IGZ1bmN0aW9uICh3aWR0aCwgdmFsdWUpIHtcbiAgICAgICAgICAvLyBUaGUgYHx8IDBgIGV4cHJlc3Npb24gaXMgbmVjZXNzYXJ5IHRvIHdvcmsgYXJvdW5kIGEgYnVnIGluXG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIHdoZXJlIGAwID09IC0wYCwgYnV0IGBTdHJpbmcoLTApICE9PSBcIjBcImAuXG4gICAgICAgICAgcmV0dXJuIChsZWFkaW5nWmVyb2VzICsgKHZhbHVlIHx8IDApKS5zbGljZSgtd2lkdGgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBEb3VibGUtcXVvdGVzIGEgc3RyaW5nIGB2YWx1ZWAsIHJlcGxhY2luZyBhbGwgQVNDSUkgY29udHJvbFxuICAgICAgICAvLyBjaGFyYWN0ZXJzIChjaGFyYWN0ZXJzIHdpdGggY29kZSB1bml0IHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDMxKSB3aXRoXG4gICAgICAgIC8vIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBRdW90ZSh2YWx1ZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG4gICAgICAgIHZhciB1bmljb2RlUHJlZml4ID0gXCJcXFxcdTAwXCI7XG4gICAgICAgIHZhciBxdW90ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSAnXCInLCBpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aCwgdXNlQ2hhckluZGV4ID0gIWNoYXJJbmRleEJ1Z2d5IHx8IGxlbmd0aCA+IDEwO1xuICAgICAgICAgIHZhciBzeW1ib2xzID0gdXNlQ2hhckluZGV4ICYmIChjaGFySW5kZXhCdWdneSA/IHZhbHVlLnNwbGl0KFwiXCIpIDogdmFsdWUpO1xuICAgICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgdmFyIGNoYXJDb2RlID0gdmFsdWUuY2hhckNvZGVBdChpbmRleCk7XG4gICAgICAgICAgICAvLyBJZiB0aGUgY2hhcmFjdGVyIGlzIGEgY29udHJvbCBjaGFyYWN0ZXIsIGFwcGVuZCBpdHMgVW5pY29kZSBvclxuICAgICAgICAgICAgLy8gc2hvcnRoYW5kIGVzY2FwZSBzZXF1ZW5jZTsgb3RoZXJ3aXNlLCBhcHBlbmQgdGhlIGNoYXJhY3RlciBhcy1pcy5cbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA4OiBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTI6IGNhc2UgMTM6IGNhc2UgMzQ6IGNhc2UgOTI6XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IEVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgKz0gdW5pY29kZVByZWZpeCArIHRvUGFkZGVkU3RyaW5nKDIsIGNoYXJDb2RlLnRvU3RyaW5nKDE2KSk7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IHVzZUNoYXJJbmRleCA/IHN5bWJvbHNbaW5kZXhdIDogdmFsdWUuY2hhckF0KGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCArICdcIic7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZXMgYW4gb2JqZWN0LiBJbXBsZW1lbnRzIHRoZVxuICAgICAgICAvLyBgU3RyKGtleSwgaG9sZGVyKWAsIGBKTyh2YWx1ZSlgLCBhbmQgYEpBKHZhbHVlKWAgb3BlcmF0aW9ucy5cbiAgICAgICAgdmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSwgb2JqZWN0LCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHZhbHVlLCBjbGFzc05hbWUsIHllYXIsIG1vbnRoLCBkYXRlLCB0aW1lLCBob3VycywgbWludXRlcywgc2Vjb25kcywgbWlsbGlzZWNvbmRzLCByZXN1bHRzLCBlbGVtZW50LCBpbmRleCwgbGVuZ3RoLCBwcmVmaXgsIHJlc3VsdDtcblxuICAgICAgICAgIG1heExpbmVMZW5ndGggPSBtYXhMaW5lTGVuZ3RoIHx8IDA7XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gTmVjZXNzYXJ5IGZvciBob3N0IG9iamVjdCBzdXBwb3J0LlxuICAgICAgICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBkYXRlQ2xhc3MgJiYgIWlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpIHtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDApIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRlcyBhcmUgc2VyaWFsaXplZCBhY2NvcmRpbmcgdG8gdGhlIGBEYXRlI3RvSlNPTmAgbWV0aG9kXG4gICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjkuNS40NC4gU2VlIHNlY3Rpb24gMTUuOS4xLjE1XG4gICAgICAgICAgICAgICAgLy8gZm9yIHRoZSBJU08gODYwMSBkYXRlIHRpbWUgc3RyaW5nIGZvcm1hdC5cbiAgICAgICAgICAgICAgICBpZiAoZ2V0RGF5KSB7XG4gICAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb21wdXRlIHRoZSB5ZWFyLCBtb250aCwgZGF0ZSwgaG91cnMsIG1pbnV0ZXMsXG4gICAgICAgICAgICAgICAgICAvLyBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGlmIHRoZSBgZ2V0VVRDKmAgbWV0aG9kcyBhcmVcbiAgICAgICAgICAgICAgICAgIC8vIGJ1Z2d5LiBBZGFwdGVkIGZyb20gQFlhZmZsZSdzIGBkYXRlLXNoaW1gIHByb2plY3QuXG4gICAgICAgICAgICAgICAgICBkYXRlID0gZmxvb3IodmFsdWUgLyA4NjRlNSk7XG4gICAgICAgICAgICAgICAgICBmb3IgKHllYXIgPSBmbG9vcihkYXRlIC8gMzY1LjI0MjUpICsgMTk3MCAtIDE7IGdldERheSh5ZWFyICsgMSwgMCkgPD0gZGF0ZTsgeWVhcisrKTtcbiAgICAgICAgICAgICAgICAgIGZvciAobW9udGggPSBmbG9vcigoZGF0ZSAtIGdldERheSh5ZWFyLCAwKSkgLyAzMC40Mik7IGdldERheSh5ZWFyLCBtb250aCArIDEpIDw9IGRhdGU7IG1vbnRoKyspO1xuICAgICAgICAgICAgICAgICAgZGF0ZSA9IDEgKyBkYXRlIC0gZ2V0RGF5KHllYXIsIG1vbnRoKTtcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBgdGltZWAgdmFsdWUgc3BlY2lmaWVzIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5IChzZWUgRVNcbiAgICAgICAgICAgICAgICAgIC8vIDUuMSBzZWN0aW9uIDE1LjkuMS4yKS4gVGhlIGZvcm11bGEgYChBICUgQiArIEIpICUgQmAgaXMgdXNlZFxuICAgICAgICAgICAgICAgICAgLy8gdG8gY29tcHV0ZSBgQSBtb2R1bG8gQmAsIGFzIHRoZSBgJWAgb3BlcmF0b3IgZG9lcyBub3RcbiAgICAgICAgICAgICAgICAgIC8vIGNvcnJlc3BvbmQgdG8gdGhlIGBtb2R1bG9gIG9wZXJhdGlvbiBmb3IgbmVnYXRpdmUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICAgIHRpbWUgPSAodmFsdWUgJSA4NjRlNSArIDg2NGU1KSAlIDg2NGU1O1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGFyZSBvYnRhaW5lZCBieVxuICAgICAgICAgICAgICAgICAgLy8gZGVjb21wb3NpbmcgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkuIFNlZSBzZWN0aW9uIDE1LjkuMS4xMC5cbiAgICAgICAgICAgICAgICAgIGhvdXJzID0gZmxvb3IodGltZSAvIDM2ZTUpICUgMjQ7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gZmxvb3IodGltZSAvIDZlNCkgJSA2MDtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSBmbG9vcih0aW1lIC8gMWUzKSAlIDYwO1xuICAgICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdGltZSAlIDFlMztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgeWVhciA9IHZhbHVlLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgICAgICAgICAgICBtb250aCA9IHZhbHVlLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gdmFsdWUuZ2V0VVRDRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgaG91cnMgPSB2YWx1ZS5nZXRVVENIb3VycygpO1xuICAgICAgICAgICAgICAgICAgbWludXRlcyA9IHZhbHVlLmdldFVUQ01pbnV0ZXMoKTtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSB2YWx1ZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB2YWx1ZS5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2VyaWFsaXplIGV4dGVuZGVkIHllYXJzIGNvcnJlY3RseS5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICh5ZWFyIDw9IDAgfHwgeWVhciA+PSAxZTQgPyAoeWVhciA8IDAgPyBcIi1cIiA6IFwiK1wiKSArIHRvUGFkZGVkU3RyaW5nKDYsIHllYXIgPCAwID8gLXllYXIgOiB5ZWFyKSA6IHRvUGFkZGVkU3RyaW5nKDQsIHllYXIpKSArXG4gICAgICAgICAgICAgICAgICBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1vbnRoICsgMSkgKyBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIGRhdGUpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1vbnRocywgZGF0ZXMsIGhvdXJzLCBtaW51dGVzLCBhbmQgc2Vjb25kcyBzaG91bGQgaGF2ZSB0d29cbiAgICAgICAgICAgICAgICAgIC8vIGRpZ2l0czsgbWlsbGlzZWNvbmRzIHNob3VsZCBoYXZlIHRocmVlLlxuICAgICAgICAgICAgICAgICAgXCJUXCIgKyB0b1BhZGRlZFN0cmluZygyLCBob3VycykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1pbnV0ZXMpICsgXCI6XCIgKyB0b1BhZGRlZFN0cmluZygyLCBzZWNvbmRzKSArXG4gICAgICAgICAgICAgICAgICAvLyBNaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUuMCwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICAgIFwiLlwiICsgdG9QYWRkZWRTdHJpbmcoMywgbWlsbGlzZWNvbmRzKSArIFwiWlwiO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUudG9KU09OID09IFwiZnVuY3Rpb25cIiAmJiAoKGNsYXNzTmFtZSAhPSBudW1iZXJDbGFzcyAmJiBjbGFzc05hbWUgIT0gc3RyaW5nQ2xhc3MgJiYgY2xhc3NOYW1lICE9IGFycmF5Q2xhc3MpIHx8IGlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpKSB7XG4gICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBhZGRzIG5vbi1zdGFuZGFyZCBgdG9KU09OYCBtZXRob2RzIHRvIHRoZVxuICAgICAgICAgICAgICAvLyBgTnVtYmVyYCwgYFN0cmluZ2AsIGBEYXRlYCwgYW5kIGBBcnJheWAgcHJvdG90eXBlcy4gSlNPTiAzXG4gICAgICAgICAgICAgIC8vIGlnbm9yZXMgYWxsIGB0b0pTT05gIG1ldGhvZHMgb24gdGhlc2Ugb2JqZWN0cyB1bmxlc3MgdGhleSBhcmVcbiAgICAgICAgICAgICAgLy8gZGVmaW5lZCBkaXJlY3RseSBvbiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b0pTT04ocHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIElmIGEgcmVwbGFjZW1lbnQgZnVuY3Rpb24gd2FzIHByb3ZpZGVkLCBjYWxsIGl0IHRvIG9idGFpbiB0aGUgdmFsdWVcbiAgICAgICAgICAgIC8vIGZvciBzZXJpYWxpemF0aW9uLlxuICAgICAgICAgICAgdmFsdWUgPSBjYWxsYmFjay5jYWxsKG9iamVjdCwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYm9vbGVhbkNsYXNzKSB7XG4gICAgICAgICAgICAvLyBCb29sZWFucyBhcmUgcmVwcmVzZW50ZWQgbGl0ZXJhbGx5LlxuICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgLy8gSlNPTiBudW1iZXJzIG11c3QgYmUgZmluaXRlLiBgSW5maW5pdHlgIGFuZCBgTmFOYCBhcmUgc2VyaWFsaXplZCBhc1xuICAgICAgICAgICAgLy8gYFwibnVsbFwiYC5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwID8gXCJcIiArIHZhbHVlIDogXCJudWxsXCI7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFN0cmluZ3MgYXJlIGRvdWJsZS1xdW90ZWQgYW5kIGVzY2FwZWQuXG4gICAgICAgICAgICByZXR1cm4gcXVvdGUoXCJcIiArIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhpcyBpcyBhIGxpbmVhciBzZWFyY2g7IHBlcmZvcm1hbmNlXG4gICAgICAgICAgICAvLyBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2YgdW5pcXVlIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBzdGFjay5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICBpZiAoc3RhY2tbbGVuZ3RoXSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDeWNsaWMgc3RydWN0dXJlcyBjYW5ub3QgYmUgc2VyaWFsaXplZCBieSBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBZGQgdGhlIG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgaW5kZW50YXRpb24gbGV2ZWwgYW5kIGluZGVudCBvbmUgYWRkaXRpb25hbCBsZXZlbC5cbiAgICAgICAgICAgIHByZWZpeCA9IGluZGVudGF0aW9uO1xuICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gd2hpdGVzcGFjZTtcbiAgICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBpbmRlbnRhdGlvbi5sZW5ndGgsIHJlc3VsdDtcbiAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIGFycmF5IGVsZW1lbnRzLlxuICAgICAgICAgICAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBzZXJpYWxpemUoaW5kZXgsIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sXG4gICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudCA9PT0gdW5kZWYgPyBcIm51bGxcIiA6IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gcmVzdWx0Lmxlbmd0aCArIChpbmRleCA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2UgJiYgKHRvdGFsTGVuZ3RoID4gbWF4TGluZUxlbmd0aCkgP1xuICAgICAgICAgICAgICAgICAgXCJbXFxuXCIgKyBpbmRlbnRhdGlvbiArIHJlc3VsdHMuam9pbihcIixcXG5cIiArIGluZGVudGF0aW9uKSArIFwiXFxuXCIgKyBwcmVmaXggKyBcIl1cIiA6XG4gICAgICAgICAgICAgICAgICBcIltcIiArIHJlc3VsdHMuam9pbihcIixcIikgKyBcIl1cIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICA6IFwiW11cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgaW5kZXg9MDtcbiAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdCBtZW1iZXJzLiBNZW1iZXJzIGFyZSBzZWxlY3RlZCBmcm9tXG4gICAgICAgICAgICAgIC8vIGVpdGhlciBhIHVzZXItc3BlY2lmaWVkIGxpc3Qgb2YgcHJvcGVydHkgbmFtZXMsIG9yIHRoZSBvYmplY3RcbiAgICAgICAgICAgICAgLy8gaXRzZWxmLlxuICAgICAgICAgICAgICBmb3JFYWNoKHByb3BlcnRpZXMgfHwgdmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQsIGVsZW1lbnQgPSBzZXJpYWxpemUocHJvcGVydHksIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2ssIG1heExpbmVMZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgICAvLyBBY2NvcmRpbmcgdG8gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMzogXCJJZiBgZ2FwYCB7d2hpdGVzcGFjZX1cbiAgICAgICAgICAgICAgICAgIC8vIGlzIG5vdCB0aGUgZW1wdHkgc3RyaW5nLCBsZXQgYG1lbWJlcmAge3F1b3RlKHByb3BlcnR5KSArIFwiOlwifVxuICAgICAgICAgICAgICAgICAgLy8gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgYG1lbWJlcmAgYW5kIHRoZSBgc3BhY2VgIGNoYXJhY3Rlci5cIlxuICAgICAgICAgICAgICAgICAgLy8gVGhlIFwiYHNwYWNlYCBjaGFyYWN0ZXJcIiByZWZlcnMgdG8gdGhlIGxpdGVyYWwgc3BhY2VcbiAgICAgICAgICAgICAgICAgIC8vIGNoYXJhY3Rlciwgbm90IHRoZSBgc3BhY2VgIHt3aWR0aH0gYXJndW1lbnQgcHJvdmlkZWQgdG9cbiAgICAgICAgICAgICAgICAgIC8vIGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIiArICh3aGl0ZXNwYWNlID8gXCIgXCIgOiBcIlwiKSArIGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4KysgPiAwID8gMSA6IDApO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2UgJiYgKHRvdGFsTGVuZ3RoID4gbWF4TGluZUxlbmd0aCkgP1xuICAgICAgICAgICAgICAgICAgXCJ7XFxuXCIgKyBpbmRlbnRhdGlvbiArIHJlc3VsdHMuam9pbihcIixcXG5cIiArIGluZGVudGF0aW9uKSArIFwiXFxuXCIgKyBwcmVmaXggKyBcIn1cIiA6XG4gICAgICAgICAgICAgICAgICBcIntcIiArIHJlc3VsdHMuam9pbihcIixcIikgKyBcIn1cIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICA6IFwie31cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgb2JqZWN0IGZyb20gdGhlIHRyYXZlcnNlZCBvYmplY3Qgc3RhY2suXG4gICAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04uc3RyaW5naWZ5YC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG5cbiAgICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCBtYXhMaW5lTGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHdoaXRlc3BhY2UsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCBjbGFzc05hbWU7XG4gICAgICAgICAgaWYgKG9iamVjdFR5cGVzW3R5cGVvZiBmaWx0ZXJdICYmIGZpbHRlcikge1xuICAgICAgICAgICAgaWYgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKGZpbHRlcikpID09IGZ1bmN0aW9uQ2xhc3MpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmaWx0ZXI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIHByb3BlcnR5IG5hbWVzIGFycmF5IGludG8gYSBtYWtlc2hpZnQgc2V0LlxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzID0ge307XG4gICAgICAgICAgICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuZ3RoID0gZmlsdGVyLmxlbmd0aCwgdmFsdWU7IGluZGV4IDwgbGVuZ3RoOyB2YWx1ZSA9IGZpbHRlcltpbmRleCsrXSwgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKSksIGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcyB8fCBjbGFzc05hbWUgPT0gbnVtYmVyQ2xhc3MpICYmIChwcm9wZXJ0aWVzW3ZhbHVlXSA9IDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHdpZHRoKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwod2lkdGgpKSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBgd2lkdGhgIHRvIGFuIGludGVnZXIgYW5kIGNyZWF0ZSBhIHN0cmluZyBjb250YWluaW5nXG4gICAgICAgICAgICAgIC8vIGB3aWR0aGAgbnVtYmVyIG9mIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgIGlmICgod2lkdGggLT0gd2lkdGggJSAxKSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKHdoaXRlc3BhY2UgPSBcIlwiLCB3aWR0aCA+IDEwICYmICh3aWR0aCA9IDEwKTsgd2hpdGVzcGFjZS5sZW5ndGggPCB3aWR0aDsgd2hpdGVzcGFjZSArPSBcIiBcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzKSB7XG4gICAgICAgICAgICAgIHdoaXRlc3BhY2UgPSB3aWR0aC5sZW5ndGggPD0gMTAgPyB3aWR0aCA6IHdpZHRoLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIGRpc2NhcmRzIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIGVtcHR5IHN0cmluZyBrZXlzXG4gICAgICAgICAgLy8gKGBcIlwiYCkgb25seSBpZiB0aGV5IGFyZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBhbiBvYmplY3QgbWVtYmVyIGxpc3RcbiAgICAgICAgICAvLyAoZS5nLiwgYCEoXCJcIiBpbiB7IFwiXCI6IDF9KWApLlxuICAgICAgICAgIHJldHVybiBzZXJpYWxpemUoXCJcIiwgKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gc291cmNlLCB2YWx1ZSksIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBcIlwiLCBbXSwgbWF4TGluZUxlbmd0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZXhwb3J0cy5jb21wYWN0U3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCl7XG4gICAgICAgICAgcmV0dXJuIGV4cG9ydHMuc3RyaW5naWZ5KHNvdXJjZSwgZmlsdGVyLCB3aWR0aCwgNjApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFB1YmxpYzogUGFyc2VzIGEgSlNPTiBzb3VyY2Ugc3RyaW5nLlxuICAgICAgaWYgKCFoYXMoXCJqc29uLXBhcnNlXCIpKSB7XG4gICAgICAgIHZhciBmcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgdW5lc2NhcGVkXG4gICAgICAgIC8vIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgVW5lc2NhcGVzID0ge1xuICAgICAgICAgIDkyOiBcIlxcXFxcIixcbiAgICAgICAgICAzNDogJ1wiJyxcbiAgICAgICAgICA0NzogXCIvXCIsXG4gICAgICAgICAgOTg6IFwiXFxiXCIsXG4gICAgICAgICAgMTE2OiBcIlxcdFwiLFxuICAgICAgICAgIDExMDogXCJcXG5cIixcbiAgICAgICAgICAxMDI6IFwiXFxmXCIsXG4gICAgICAgICAgMTE0OiBcIlxcclwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFN0b3JlcyB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICB2YXIgSW5kZXgsIFNvdXJjZTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVzZXRzIHRoZSBwYXJzZXIgc3RhdGUgYW5kIHRocm93cyBhIGBTeW50YXhFcnJvcmAuXG4gICAgICAgIHZhciBhYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgdGhyb3cgU3ludGF4RXJyb3IoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmV0dXJucyB0aGUgbmV4dCB0b2tlbiwgb3IgYFwiJFwiYCBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkXG4gICAgICAgIC8vIHRoZSBlbmQgb2YgdGhlIHNvdXJjZSBzdHJpbmcuIEEgdG9rZW4gbWF5IGJlIGEgc3RyaW5nLCBudW1iZXIsIGBudWxsYFxuICAgICAgICAvLyBsaXRlcmFsLCBvciBCb29sZWFuIGxpdGVyYWwuXG4gICAgICAgIHZhciBsZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IFNvdXJjZSwgbGVuZ3RoID0gc291cmNlLmxlbmd0aCwgdmFsdWUsIGJlZ2luLCBwb3NpdGlvbiwgaXNTaWduZWQsIGNoYXJDb2RlO1xuICAgICAgICAgIHdoaWxlIChJbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgIGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMzogY2FzZSAzMjpcbiAgICAgICAgICAgICAgICAvLyBTa2lwIHdoaXRlc3BhY2UgdG9rZW5zLCBpbmNsdWRpbmcgdGFicywgY2FycmlhZ2UgcmV0dXJucywgbGluZVxuICAgICAgICAgICAgICAgIC8vIGZlZWRzLCBhbmQgc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIDEyMzogY2FzZSAxMjU6IGNhc2UgOTE6IGNhc2UgOTM6IGNhc2UgNTg6IGNhc2UgNDQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgYSBwdW5jdHVhdG9yIHRva2VuIChge2AsIGB9YCwgYFtgLCBgXWAsIGA6YCwgb3IgYCxgKSBhdFxuICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAgICAgICAgICAgIHZhbHVlID0gY2hhckluZGV4QnVnZ3kgPyBzb3VyY2UuY2hhckF0KEluZGV4KSA6IHNvdXJjZVtJbmRleF07XG4gICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgIGNhc2UgMzQ6XG4gICAgICAgICAgICAgICAgLy8gYFwiYCBkZWxpbWl0cyBhIEpTT04gc3RyaW5nOyBhZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmRcbiAgICAgICAgICAgICAgICAvLyBiZWdpbiBwYXJzaW5nIHRoZSBzdHJpbmcuIFN0cmluZyB0b2tlbnMgYXJlIHByZWZpeGVkIHdpdGggdGhlXG4gICAgICAgICAgICAgICAgLy8gc2VudGluZWwgYEBgIGNoYXJhY3RlciB0byBkaXN0aW5ndWlzaCB0aGVtIGZyb20gcHVuY3R1YXRvcnMgYW5kXG4gICAgICAgICAgICAgICAgLy8gZW5kLW9mLXN0cmluZyB0b2tlbnMuXG4gICAgICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFwiQFwiLCBJbmRleCsrOyBJbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5lc2NhcGVkIEFTQ0lJIGNvbnRyb2wgY2hhcmFjdGVycyAodGhvc2Ugd2l0aCBhIGNvZGUgdW5pdFxuICAgICAgICAgICAgICAgICAgICAvLyBsZXNzIHRoYW4gdGhlIHNwYWNlIGNoYXJhY3RlcikgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoYXJDb2RlID09IDkyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgcmV2ZXJzZSBzb2xpZHVzIChgXFxgKSBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIGFuIGVzY2FwZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gY29udHJvbCBjaGFyYWN0ZXIgKGluY2x1ZGluZyBgXCJgLCBgXFxgLCBhbmQgYC9gKSBvciBVbmljb2RlXG4gICAgICAgICAgICAgICAgICAgIC8vIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgOTI6IGNhc2UgMzQ6IGNhc2UgNDc6IGNhc2UgOTg6IGNhc2UgMTE2OiBjYXNlIDExMDogY2FzZSAxMDI6IGNhc2UgMTE0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2aXZlIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gVW5lc2NhcGVzW2NoYXJDb2RlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIDExNzpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBcXHVgIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYSBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgdG8gdGhlIGZpcnN0IGNoYXJhY3RlciBhbmQgdmFsaWRhdGUgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmb3VyLWRpZ2l0IGNvZGUgcG9pbnQuXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWdpbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXggKyA0OyBJbmRleCA8IHBvc2l0aW9uOyBJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBIHZhbGlkIHNlcXVlbmNlIGNvbXByaXNlcyBmb3VyIGhleGRpZ2l0cyAoY2FzZS1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5zZW5zaXRpdmUpIHRoYXQgZm9ybSBhIHNpbmdsZSBoZXhhZGVjaW1hbCB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcgfHwgY2hhckNvZGUgPj0gOTcgJiYgY2hhckNvZGUgPD0gMTAyIHx8IGNoYXJDb2RlID49IDY1ICYmIGNoYXJDb2RlIDw9IDcwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2aXZlIHRoZSBlc2NhcGVkIGNoYXJhY3Rlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IGZyb21DaGFyQ29kZShcIjB4XCIgKyBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBBbiB1bmVzY2FwZWQgZG91YmxlLXF1b3RlIGNoYXJhY3RlciBtYXJrcyB0aGUgZW5kIG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gT3B0aW1pemUgZm9yIHRoZSBjb21tb24gY2FzZSB3aGVyZSBhIHN0cmluZyBpcyB2YWxpZC5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGNoYXJDb2RlID49IDMyICYmIGNoYXJDb2RlICE9IDkyICYmIGNoYXJDb2RlICE9IDM0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBBcHBlbmQgdGhlIHN0cmluZyBhcy1pcy5cbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZCByZXR1cm4gdGhlIHJldml2ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVW50ZXJtaW5hdGVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIG51bWJlcnMgYW5kIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgICAgLy8gQWR2YW5jZSBwYXN0IHRoZSBuZWdhdGl2ZSBzaWduLCBpZiBvbmUgaXMgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0NSkge1xuICAgICAgICAgICAgICAgICAgaXNTaWduZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgYW4gaW50ZWdlciBvciBmbG9hdGluZy1wb2ludCB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgemVyb2VzIGFyZSBpbnRlcnByZXRlZCBhcyBvY3RhbCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0OCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXggKyAxKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIG9jdGFsIGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGludGVnZXIgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgZm9yICg7IEluZGV4IDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IEluZGV4KyspO1xuICAgICAgICAgICAgICAgICAgLy8gRmxvYXRzIGNhbm5vdCBjb250YWluIGEgbGVhZGluZyBkZWNpbWFsIHBvaW50OyBob3dldmVyLCB0aGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlIGlzIGFscmVhZHkgYWNjb3VudGVkIGZvciBieSB0aGUgcGFyc2VyLlxuICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSA0Nikge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBkZWNpbWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgZm9yICg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIHRyYWlsaW5nIGRlY2ltYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgZXhwb25lbnRzLiBUaGUgYGVgIGRlbm90aW5nIHRoZSBleHBvbmVudCBpc1xuICAgICAgICAgICAgICAgICAgLy8gY2FzZS1pbnNlbnNpdGl2ZS5cbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDEwMSB8fCBjaGFyQ29kZSA9PSA2OSkge1xuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIHBhc3QgdGhlIHNpZ24gZm9sbG93aW5nIHRoZSBleHBvbmVudCwgaWYgb25lIGlzXG4gICAgICAgICAgICAgICAgICAgIC8vIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQzIHx8IGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgZXhwb25lbnRpYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIGVtcHR5IGV4cG9uZW50LlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIENvZXJjZSB0aGUgcGFyc2VkIHZhbHVlIHRvIGEgSmF2YVNjcmlwdCBudW1iZXIuXG4gICAgICAgICAgICAgICAgICByZXR1cm4gK3NvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBBIG5lZ2F0aXZlIHNpZ24gbWF5IG9ubHkgcHJlY2VkZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgIGlmIChpc1NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gYHRydWVgLCBgZmFsc2VgLCBhbmQgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA1KSA9PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDU7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJudWxsXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVW5yZWNvZ25pemVkIHRva2VuLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJldHVybiB0aGUgc2VudGluZWwgYCRgIGNoYXJhY3RlciBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkIHRoZSBlbmRcbiAgICAgICAgICAvLyBvZiB0aGUgc291cmNlIHN0cmluZy5cbiAgICAgICAgICByZXR1cm4gXCIkXCI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFBhcnNlcyBhIEpTT04gYHZhbHVlYCB0b2tlbi5cbiAgICAgICAgdmFyIGdldCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHRzLCBoYXNNZW1iZXJzO1xuICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIiRcIikge1xuICAgICAgICAgICAgLy8gVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmICgoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgPT0gXCJAXCIpIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZW50aW5lbCBgQGAgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQYXJzZSBvYmplY3QgYW5kIGFycmF5IGxpdGVyYWxzLlxuICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiW1wiKSB7XG4gICAgICAgICAgICAgIC8vIFBhcnNlcyBhIEpTT04gYXJyYXksIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IGFycmF5LlxuICAgICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3Npbmcgc3F1YXJlIGJyYWNrZXQgbWFya3MgdGhlIGVuZCBvZiB0aGUgYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgYXJyYXkgbGl0ZXJhbCBjb250YWlucyBlbGVtZW50cywgdGhlIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgYSBjb21tYSBzZXBhcmF0aW5nIHRoZSBwcmV2aW91cyBlbGVtZW50IGZyb20gdGhlXG4gICAgICAgICAgICAgICAgLy8gbmV4dC5cbiAgICAgICAgICAgICAgICBpZiAoaGFzTWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIGFycmF5IGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEVsaXNpb25zIGFuZCBsZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChnZXQodmFsdWUpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT0gXCJ7XCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBvYmplY3QsIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IG9iamVjdC5cbiAgICAgICAgICAgICAgcmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgLy8gQSBjbG9zaW5nIGN1cmx5IGJyYWNlIG1hcmtzIHRoZSBlbmQgb2YgdGhlIG9iamVjdCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvYmplY3QgbGl0ZXJhbCBjb250YWlucyBtZW1iZXJzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRvci5cbiAgICAgICAgICAgICAgICBpZiAoaGFzTWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIG9iamVjdCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBvYmplY3QgbWVtYmVyLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBMZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZCwgb2JqZWN0IHByb3BlcnR5IG5hbWVzIG11c3QgYmVcbiAgICAgICAgICAgICAgICAvLyBkb3VibGUtcXVvdGVkIHN0cmluZ3MsIGFuZCBhIGA6YCBtdXN0IHNlcGFyYXRlIGVhY2ggcHJvcGVydHlcbiAgICAgICAgICAgICAgICAvLyBuYW1lIGFuZCB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIgfHwgdHlwZW9mIHZhbHVlICE9IFwic3RyaW5nXCIgfHwgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KDApIDogdmFsdWVbMF0pICE9IFwiQFwiIHx8IGxleCgpICE9IFwiOlwiKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzW3ZhbHVlLnNsaWNlKDEpXSA9IGdldChsZXgoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRva2VuIGVuY291bnRlcmVkLlxuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBVcGRhdGVzIGEgdHJhdmVyc2VkIG9iamVjdCBtZW1iZXIuXG4gICAgICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgZWxlbWVudCA9IHdhbGsoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spO1xuICAgICAgICAgIGlmIChlbGVtZW50ID09PSB1bmRlZikge1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZVtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdXJjZVtwcm9wZXJ0eV0gPSBlbGVtZW50O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGEgcGFyc2VkIEpTT04gb2JqZWN0LCBpbnZva2luZyB0aGVcbiAgICAgICAgLy8gYGNhbGxiYWNrYCBmdW5jdGlvbiBmb3IgZWFjaCB2YWx1ZS4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFdhbGsoaG9sZGVyLCBuYW1lKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgICAgICAgdmFyIHdhbGsgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBzb3VyY2VbcHJvcGVydHldLCBsZW5ndGg7XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBgZm9yRWFjaGAgY2FuJ3QgYmUgdXNlZCB0byB0cmF2ZXJzZSBhbiBhcnJheSBpbiBPcGVyYSA8PSA4LjU0XG4gICAgICAgICAgICAvLyBiZWNhdXNlIGl0cyBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpbXBsZW1lbnRhdGlvbiByZXR1cm5zIGBmYWxzZWBcbiAgICAgICAgICAgIC8vIGZvciBhcnJheSBpbmRpY2VzIChlLmcuLCBgIVsxLCAyLCAzXS5oYXNPd25Qcm9wZXJ0eShcIjBcIilgKS5cbiAgICAgICAgICAgIGlmIChnZXRDbGFzcy5jYWxsKHZhbHVlKSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIGZvciAobGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIGxlbmd0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChzb3VyY2UsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5wYXJzZWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICBleHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHNvdXJjZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgcmVzdWx0LCB2YWx1ZTtcbiAgICAgICAgICBJbmRleCA9IDA7XG4gICAgICAgICAgU291cmNlID0gXCJcIiArIHNvdXJjZTtcbiAgICAgICAgICByZXN1bHQgPSBnZXQobGV4KCkpO1xuICAgICAgICAgIC8vIElmIGEgSlNPTiBzdHJpbmcgY29udGFpbnMgbXVsdGlwbGUgdG9rZW5zLCBpdCBpcyBpbnZhbGlkLlxuICAgICAgICAgIGlmIChsZXgoKSAhPSBcIiRcIikge1xuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVzZXQgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGdldENsYXNzLmNhbGwoY2FsbGJhY2spID09IGZ1bmN0aW9uQ2xhc3MgPyB3YWxrKCh2YWx1ZSA9IHt9LCB2YWx1ZVtcIlwiXSA9IHJlc3VsdCwgdmFsdWUpLCBcIlwiLCBjYWxsYmFjaykgOiByZXN1bHQ7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZXhwb3J0c1tcInJ1bkluQ29udGV4dFwiXSA9IHJ1bkluQ29udGV4dDtcbiAgICByZXR1cm4gZXhwb3J0cztcbiAgfVxuXG4gIGlmIChmcmVlRXhwb3J0cyAmJiAhaXNMb2FkZXIpIHtcbiAgICAvLyBFeHBvcnQgZm9yIENvbW1vbkpTIGVudmlyb25tZW50cy5cbiAgICBydW5JbkNvbnRleHQocm9vdCwgZnJlZUV4cG9ydHMpO1xuICB9IGVsc2Uge1xuICAgIC8vIEV4cG9ydCBmb3Igd2ViIGJyb3dzZXJzIGFuZCBKYXZhU2NyaXB0IGVuZ2luZXMuXG4gICAgdmFyIG5hdGl2ZUpTT04gPSByb290LkpTT04sXG4gICAgICAgIHByZXZpb3VzSlNPTiA9IHJvb3RbXCJKU09OM1wiXSxcbiAgICAgICAgaXNSZXN0b3JlZCA9IGZhbHNlO1xuXG4gICAgdmFyIEpTT04zID0gcnVuSW5Db250ZXh0KHJvb3QsIChyb290W1wiSlNPTjNcIl0gPSB7XG4gICAgICAvLyBQdWJsaWM6IFJlc3RvcmVzIHRoZSBvcmlnaW5hbCB2YWx1ZSBvZiB0aGUgZ2xvYmFsIGBKU09OYCBvYmplY3QgYW5kXG4gICAgICAvLyByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBgSlNPTjNgIG9iamVjdC5cbiAgICAgIFwibm9Db25mbGljdFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghaXNSZXN0b3JlZCkge1xuICAgICAgICAgIGlzUmVzdG9yZWQgPSB0cnVlO1xuICAgICAgICAgIHJvb3QuSlNPTiA9IG5hdGl2ZUpTT047XG4gICAgICAgICAgcm9vdFtcIkpTT04zXCJdID0gcHJldmlvdXNKU09OO1xuICAgICAgICAgIG5hdGl2ZUpTT04gPSBwcmV2aW91c0pTT04gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBKU09OMztcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICByb290LkpTT04gPSB7XG4gICAgICBcInBhcnNlXCI6IEpTT04zLnBhcnNlLFxuICAgICAgXCJzdHJpbmdpZnlcIjogSlNPTjMuc3RyaW5naWZ5XG4gICAgfTtcbiAgfVxuXG4gIC8vIEV4cG9ydCBmb3IgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLlxuICBpZiAoaXNMb2FkZXIpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIEpTT04zO1xuICAgIH0pO1xuICB9XG59KS5jYWxsKHRoaXMpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnRhYlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHRhYlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3RhYicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3RhYnMvdGFiLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXnRhYnNldCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGhlYWRpbmc6ICdAJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdGFic2V0Q29udHJvbGxlcikge1xuICAgICAgICB0YWJzZXRDb250cm9sbGVyLmFkZFRhYihzY29wZSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFic2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFic2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFic2V0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndGFicy90YWJzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcblxuICAgICAgLy8gSW50ZXJmYWNlIGZvciB0YWJzIHRvIHJlZ2lzdGVyIHRoZW1zZWx2ZXNcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50YWJzID0gW107XG5cbiAgICAgICAgdGhpcy5hZGRUYWIgPSBmdW5jdGlvbih0YWJTY29wZSkge1xuICAgICAgICAgIC8vIEZpcnN0IHRhYiBpcyBhbHdheXMgYXV0by1hY3RpdmF0ZWQ7IG90aGVycyBhdXRvLWRlYWN0aXZhdGVkXG4gICAgICAgICAgdGFiU2NvcGUuYWN0aXZlID0gc2VsZi50YWJzLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgICBzZWxmLnRhYnMucHVzaCh0YWJTY29wZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zaG93VGFiID0gZnVuY3Rpb24oc2VsZWN0ZWRUYWIpIHtcbiAgICAgICAgICBzZWxmLnRhYnMuZm9yRWFjaChmdW5jdGlvbih0YWIpIHtcbiAgICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCB0YWIsIGRlYWN0aXZhdGUgYWxsIG90aGVyc1xuICAgICAgICAgICAgdGFiLmFjdGl2ZSA9IHRhYiA9PT0gc2VsZWN0ZWRUYWI7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9LFxuXG4gICAgICAvLyBFeHBvc2UgY29udHJvbGxlciB0byB0ZW1wbGF0ZXMgYXMgXCJ0YWJzZXRcIlxuICAgICAgY29udHJvbGxlckFzOiAndGFic2V0J1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdCcsIGZ1bmN0aW9uKHZsLCB2ZywgJHRpbWVvdXQsICRxLCBEYXRhc2V0LCBDb25maWcsIGNvbnN0cywgXywgJGRvY3VtZW50LCBMb2dnZXIsIEhlYXApIHtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgdmFyIE1BWF9DQU5WQVNfU0laRSA9IDMyNzY3LzIsIE1BWF9DQU5WQVNfQVJFQSA9IDI2ODQzNTQ1Ni80O1xuXG4gICAgdmFyIHJlbmRlclF1ZXVlID0gbmV3IEhlYXAoZnVuY3Rpb24oYSwgYil7XG4gICAgICAgIHJldHVybiBiLnByaW9yaXR5IC0gYS5wcmlvcml0eTtcbiAgICAgIH0pLFxuICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBnZXRSZW5kZXJlcih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAvLyB1c2UgY2FudmFzIGJ5IGRlZmF1bHQgYnV0IHVzZSBzdmcgaWYgdGhlIHZpc3VhbGl6YXRpb24gaXMgdG9vIGJpZ1xuICAgICAgaWYgKHdpZHRoID4gTUFYX0NBTlZBU19TSVpFIHx8IGhlaWdodCA+IE1BWF9DQU5WQVNfU0laRSB8fCB3aWR0aCpoZWlnaHQgPiBNQVhfQ0FOVkFTX0FSRUEpIHtcbiAgICAgICAgcmV0dXJuICdzdmcnO1xuICAgICAgfVxuICAgICAgcmV0dXJuICdjYW52YXMnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdC92bHBsb3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPScsXG4gICAgICAgIGlzSW5MaXN0OiAnPScsXG5cbiAgICAgICAgYWx3YXlzU2Nyb2xsYWJsZTogJz0nLFxuICAgICAgICBjb25maWdTZXQ6ICdAJyxcbiAgICAgICAgbWF4SGVpZ2h0Oic9JyxcbiAgICAgICAgbWF4V2lkdGg6ICc9JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc9JyxcbiAgICAgICAgcHJpb3JpdHk6ICc9JyxcbiAgICAgICAgcmVzY2FsZTogJz0nLFxuICAgICAgICB0aHVtYm5haWw6ICc9JyxcbiAgICAgICAgdG9vbHRpcDogJz0nLFxuICAgICAgfSxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICB2YXIgSE9WRVJfVElNRU9VVCA9IDUwMCxcbiAgICAgICAgICBUT09MVElQX1RJTUVPVVQgPSAyNTA7XG5cbiAgICAgICAgc2NvcGUudmlzSWQgPSAoY291bnRlcisrKTtcbiAgICAgICAgc2NvcGUuaG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgc2NvcGUudG9vbHRpcFByb21pc2UgPSBudWxsO1xuICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gZmFsc2U7XG4gICAgICAgIHZhciBmb3JtYXQgPSB2bC5mb3JtYXQoJycpO1xuXG4gICAgICAgIHNjb3BlLm1vdXNlb3ZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmhvdmVyUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfTU9VU0VPVkVSLCAnJywgc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSAhc2NvcGUudGh1bWJuYWlsO1xuICAgICAgICAgIH0sIEhPVkVSX1RJTUVPVVQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLm1vdXNlb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmhvdmVyRm9jdXMpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9VVCwgJycsIHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLmhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9IHNjb3BlLnVubG9ja2VkID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gdmlld09uTW91c2VPdmVyKGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgaWYgKCFpdGVtLmRhdHVtLmRhdGEpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICBzY29wZS50b29sdGlwUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uIGFjdGl2YXRlVG9vbHRpcCgpe1xuICAgICAgICAgICAgc2NvcGUudG9vbHRpcEFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfVE9PTFRJUCwgaXRlbS5kYXR1bSk7XG5cbiAgICAgICAgICAgIC8vIGNvbnZlcnQgZGF0YSBpbnRvIGEgZm9ybWF0IHRoYXQgd2UgY2FuIGVhc2lseSB1c2Ugd2l0aCBuZyB0YWJsZSBhbmQgbmctcmVwZWF0XG4gICAgICAgICAgICAvLyBUT0RPOiByZXZpc2UgaWYgdGhpcyBpcyBhY3R1YWxseSBhIGdvb2QgaWRlYVxuICAgICAgICAgICAgc2NvcGUuZGF0YSA9IF8ucGFpcnMoaXRlbS5kYXR1bS5kYXRhKS5tYXAoZnVuY3Rpb24ocCkge1xuICAgICAgICAgICAgICBwWzFdID0gdmcuaXNOdW1iZXIocFsxXSkgPyBmb3JtYXQocFsxXSkgOiBwWzFdO1xuICAgICAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuXG4gICAgICAgICAgICB2YXIgdG9vbHRpcCA9IGVsZW1lbnQuZmluZCgnLnZpcy10b29sdGlwJyksXG4gICAgICAgICAgICAgICRib2R5ID0gYW5ndWxhci5lbGVtZW50KCRkb2N1bWVudCksXG4gICAgICAgICAgICAgIHdpZHRoID0gdG9vbHRpcC53aWR0aCgpLFxuICAgICAgICAgICAgICBoZWlnaHQ9IHRvb2x0aXAuaGVpZ2h0KCk7XG5cbiAgICAgICAgICAgIC8vIHB1dCB0b29sdGlwIGFib3ZlIGlmIGl0J3MgbmVhciB0aGUgc2NyZWVuJ3MgYm90dG9tIGJvcmRlclxuICAgICAgICAgICAgaWYgKGV2ZW50LnBhZ2VZKzEwK2hlaWdodCA8ICRib2R5LmhlaWdodCgpKSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCAoZXZlbnQucGFnZVkrMTApKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCAoZXZlbnQucGFnZVktMTAtaGVpZ2h0KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHB1dCB0b29sdGlwIG9uIGxlZnQgaWYgaXQncyBuZWFyIHRoZSBzY3JlZW4ncyByaWdodCBib3JkZXJcbiAgICAgICAgICAgIGlmIChldmVudC5wYWdlWCsxMCsgd2lkdGggPCAkYm9keS53aWR0aCgpKSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgKGV2ZW50LnBhZ2VYKzEwKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygnbGVmdCcsIChldmVudC5wYWdlWC0xMC13aWR0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIFRPT0xUSVBfVElNRU9VVCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB2aWV3T25Nb3VzZU91dChldmVudCwgaXRlbSkge1xuICAgICAgICAgIC8vY2xlYXIgcG9zaXRpb25zXG4gICAgICAgICAgdmFyIHRvb2x0aXAgPSBlbGVtZW50LmZpbmQoJy52aXMtdG9vbHRpcCcpO1xuICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCBudWxsKTtcbiAgICAgICAgICB0b29sdGlwLmNzcygnbGVmdCcsIG51bGwpO1xuICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChzY29wZS50b29sdGlwUHJvbWlzZSk7XG4gICAgICAgICAgaWYgKHNjb3BlLnRvb2x0aXBBY3RpdmUpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQX0VORCwgaXRlbS5kYXR1bSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICBzY29wZS5kYXRhID0gW107XG4gICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmdTcGVjKCkge1xuICAgICAgICAgIHZhciBjb25maWdTZXQgPSBzY29wZS5jb25maWdTZXQgfHwgY29uc3RzLmRlZmF1bHRDb25maWdTZXQgfHwge307XG5cbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LnZsU3BlYykgcmV0dXJuO1xuXG4gICAgICAgICAgdmFyIHZsU3BlYyA9IF8uY2xvbmVEZWVwKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgdmwuZXh0ZW5kKHZsU3BlYy5jb25maWcsIENvbmZpZ1tjb25maWdTZXRdKCkpO1xuXG4gICAgICAgICAgLy8gdXNlIGNoYXJ0IHN0YXRzIGlmIGF2YWlsYWJsZSAoZm9yIGV4YW1wbGUgZnJvbSBib29rbWFya3MpXG4gICAgICAgICAgdmFyIHN0YXRzID0gc2NvcGUuY2hhcnQuc3RhdHMgfHwgRGF0YXNldC5zdGF0cztcblxuICAgICAgICAgIHJldHVybiB2bC5jb21waWxlKHZsU3BlYywgc3RhdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzY2FsZUlmRW5hYmxlKCkge1xuICAgICAgICAgIGlmIChzY29wZS5yZXNjYWxlKSB7XG4gICAgICAgICAgICB2YXIgeFJhdGlvID0gc2NvcGUubWF4V2lkdGggPiAwID8gIHNjb3BlLm1heFdpZHRoIC8gc2NvcGUud2lkdGggOiAxO1xuICAgICAgICAgICAgdmFyIHlSYXRpbyA9IHNjb3BlLm1heEhlaWdodCA+IDAgPyBzY29wZS5tYXhIZWlnaHQgLyBzY29wZS5oZWlnaHQgIDogMTtcbiAgICAgICAgICAgIHZhciByYXRpbyA9IE1hdGgubWluKHhSYXRpbywgeVJhdGlvKTtcblxuICAgICAgICAgICAgdmFyIG5pY2VSYXRpbyA9IDE7XG4gICAgICAgICAgICB3aGlsZSAoMC43NSAqIG5pY2VSYXRpbz4gcmF0aW8pIHtcbiAgICAgICAgICAgICAgbmljZVJhdGlvIC89IDI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB0ID0gbmljZVJhdGlvICogMTAwIC8gMiAmJiAwO1xuICAgICAgICAgICAgZWxlbWVudC5maW5kKCcudmVnYScpLmNzcygndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgtJyt0KyclLCAtJyt0KyclKSBzY2FsZSgnK25pY2VSYXRpbysnKScpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50LmZpbmQoJy52ZWdhJykuY3NzKCd0cmFuc2Zvcm0nLCBudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXJRdWV1ZU5leHQoKSB7XG4gICAgICAgICAgLy8gcmVuZGVyIG5leHQgaXRlbSBpbiB0aGUgcXVldWVcbiAgICAgICAgICBpZiAocmVuZGVyUXVldWUuc2l6ZSgpID4gMCkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSByZW5kZXJRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIG5leHQucGFyc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3Igc2F5IHRoYXQgbm8gb25lIGlzIHJlbmRlcmluZ1xuICAgICAgICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyKHNwZWMpIHtcbiAgICAgICAgICBpZiAoIXNwZWMpIHtcbiAgICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3V0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuaGVpZ2h0ID0gc3BlYy5oZWlnaHQ7XG4gICAgICAgICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdjYW4gbm90IGZpbmQgdmlzIGVsZW1lbnQnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgc2hvcnRoYW5kID0gc2NvcGUuY2hhcnQuc2hvcnRoYW5kIHx8IChzY29wZS5jaGFydC52bFNwZWMgPyB2bC5FbmNvZGluZy5zaG9ydGhhbmQoc2NvcGUuY2hhcnQudmxTcGVjKSA6ICcnKTtcblxuICAgICAgICAgIHNjb3BlLnJlbmRlcmVyID0gZ2V0UmVuZGVyZXIoc3BlYyk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBwYXJzZVZlZ2EoKSB7XG4gICAgICAgICAgICAvLyBpZiBubyBsb25nZXIgYSBwYXJ0IG9mIHRoZSBsaXN0LCBjYW5jZWwhXG4gICAgICAgICAgICBpZiAoc2NvcGUuZGVzdHJveWVkIHx8IHNjb3BlLmRpc2FibGVkIHx8IChzY29wZS5pc0luTGlzdCAmJiBzY29wZS5jaGFydC5maWVsZFNldEtleSAmJiAhc2NvcGUuaXNJbkxpc3Qoc2NvcGUuY2hhcnQuZmllbGRTZXRLZXkpKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2FuY2VsIHJlbmRlcmluZycsIHNob3J0aGFuZCk7XG4gICAgICAgICAgICAgIHJlbmRlclF1ZXVlTmV4dCgpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgLy8gcmVuZGVyIGlmIHN0aWxsIGEgcGFydCBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgdmcucGFyc2Uuc3BlYyhzcGVjLCBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBlbmRQYXJzZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBudWxsO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBjaGFydCh7ZWw6IGVsZW1lbnRbMF19KTtcblxuICAgICAgICAgICAgICAgIGlmICghY29uc3RzLnVzZVVybCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5kYXRhKHtyYXc6IERhdGFzZXQuZGF0YX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoID0gIHZpZXcud2lkdGgoKTtcbiAgICAgICAgICAgICAgICBzY29wZS5oZWlnaHQgPSB2aWV3LmhlaWdodCgpO1xuICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyZXIoZ2V0UmVuZGVyZXIoc3BlYy53aWR0aCwgc2NvcGUuaGVpZ2h0KSk7XG4gICAgICAgICAgICAgICAgdmlldy51cGRhdGUoKTtcblxuICAgICAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9SRU5ERVIsICcnLCBzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgICAgICAgICAgcmVzY2FsZUlmRW5hYmxlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZW5kQ2hhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGFyc2Ugc3BlYycsIChlbmRQYXJzZS1zdGFydCksICdjaGFydGluZycsIChlbmRDaGFydC1lbmRQYXJzZSksIHNob3J0aGFuZCk7XG4gICAgICAgICAgICAgICAgaWYgKHNjb3BlLnRvb2x0aXApIHtcbiAgICAgICAgICAgICAgICAgIHZpZXcub24oJ21vdXNlb3ZlcicsIHZpZXdPbk1vdXNlT3Zlcik7XG4gICAgICAgICAgICAgICAgICB2aWV3Lm9uKCdtb3VzZW91dCcsIHZpZXdPbk1vdXNlT3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHJlbmRlclF1ZXVlTmV4dCgpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghcmVuZGVyaW5nKSB7IC8vIGlmIG5vIGluc3RhbmNlIGlzIGJlaW5nIHJlbmRlciAtLSByZW5kZXJpbmcgbm93XG4gICAgICAgICAgICByZW5kZXJpbmc9dHJ1ZTtcbiAgICAgICAgICAgIHBhcnNlVmVnYSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgcXVldWUgaXRcbiAgICAgICAgICAgIHJlbmRlclF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICBwcmlvcml0eTogc2NvcGUucHJpb3JpdHkgfHwgMCxcbiAgICAgICAgICAgICAgcGFyc2U6IHBhcnNlVmVnYVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpZXc7XG4gICAgICAgIHNjb3BlLiR3YXRjaCgnY2hhcnQudmxTcGVjJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNwZWMgPSBzY29wZS5jaGFydC52Z1NwZWMgPSBnZXRWZ1NwZWMoKTtcbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LmNsZWFuU3BlYykge1xuICAgICAgICAgICAgc2NvcGUuY2hhcnQuY2xlYW5TcGVjID0gdmwuRW5jb2RpbmcuZnJvbVNwZWMoc2NvcGUuY2hhcnQudmxTcGVjKS50b1NwZWModHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbmRlcihzcGVjKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd2bHBsb3QgZGVzdHJveWVkJyk7XG4gICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgICAvLyBGSVhNRSBhbm90aGVyIHdheSB0aGF0IHNob3VsZCBlbGltaW5hdGUgdGhpbmdzIGZyb20gbWVtb3J5IGZhc3RlciBzaG91bGQgYmUgcmVtb3ZpbmdcbiAgICAgICAgICAvLyBtYXliZSBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgIC8vIHJlbmRlclF1ZXVlLnNwbGljZShyZW5kZXJRdWV1ZS5pbmRleE9mKHBhcnNlVmVnYSksIDEpKTtcbiAgICAgICAgICAvLyBidXQgd2l0aG91dCBwcm9wZXIgdGVzdGluZywgdGhpcyBpcyByaXNraWVyIHRoYW4gc2V0dGluZyBzY29wZS5kZXN0cm95ZWQuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwJywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCB2bCwgRGF0YXNldCwgRHJvcCwgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIC8qIHBhc3MgdG8gdmxwbG90ICoqL1xuICAgICAgICBjaGFydDogJz0nLFxuXG4gICAgICAgIC8vb3B0aW9uYWxcbiAgICAgICAgZGlzYWJsZWQ6ICc9JyxcbiAgICAgICAgaXNJbkxpc3Q6ICc9JyxcblxuICAgICAgICBhbHdheXNTY3JvbGxhYmxlOiAnPScsXG4gICAgICAgIGNvbmZpZ1NldDogJ0AnLFxuICAgICAgICBtYXhIZWlnaHQ6ICc9JyxcbiAgICAgICAgbWF4V2lkdGg6ICc9JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc9JyxcbiAgICAgICAgcHJpb3JpdHk6ICc9JyxcbiAgICAgICAgcmVzY2FsZTogJz0nLFxuICAgICAgICB0aHVtYm5haWw6ICc9JyxcbiAgICAgICAgdG9vbHRpcDogJz0nLFxuXG4gICAgICAgIC8qIHZscGxvdGdyb3VwIHNwZWNpZmljICovXG5cbiAgICAgICAgZmllbGRTZXQ6ICc9JyxcblxuICAgICAgICBzaG93Qm9va21hcms6ICdAJyxcbiAgICAgICAgc2hvd0RlYnVnOiAnPScsXG4gICAgICAgIHNob3dFeHBhbmQ6ICc9JyxcbiAgICAgICAgc2hvd0ZpbHRlck51bGw6ICdAJyxcbiAgICAgICAgc2hvd0xhYmVsOiAnQCcsXG4gICAgICAgIHNob3dMb2c6ICdAJyxcbiAgICAgICAgc2hvd01hcmtUeXBlOiAnQCcsXG4gICAgICAgIHNob3dTb3J0OiAnQCcsXG4gICAgICAgIHNob3dUcmFuc3Bvc2U6ICdAJyxcblxuICAgICAgICBhbHdheXNTZWxlY3RlZDogJz0nLFxuICAgICAgICBpc1NlbGVjdGVkOiAnPScsXG4gICAgICAgIGhpZ2hsaWdodGVkOiAnPScsXG4gICAgICAgIGV4cGFuZEFjdGlvbjogJyYnLFxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcblxuICAgICAgICBzY29wZS5sb2dDb2RlID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lKyc6XFxuXFxuJywgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgTE9HXG5cbiAgICAgICAgc2NvcGUubG9nID0ge307XG4gICAgICAgIHNjb3BlLmxvZy5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgZW5jVHlwZSkge1xuICAgICAgICAgIGlmICghc3BlYykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nLFxuICAgICAgICAgICAgZmllbGQgPSBlbmNvZGluZ1tlbmNUeXBlXTtcblxuICAgICAgICAgIHJldHVybiBmaWVsZCAmJiBmaWVsZC50eXBlID09PSdRJyAmJiAhZmllbGQuYmluO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy50b2dnbGUgPSBmdW5jdGlvbihzcGVjLCBlbmNUeXBlKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBlbmNUeXBlKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZCA9IHNwZWMuZW5jb2RpbmdbZW5jVHlwZV0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkLnNjYWxlID0gZmllbGQuc2NhbGUgfHwge307XG5cbiAgICAgICAgICBzY2FsZS50eXBlID0gc2NhbGUudHlwZSA9PT0gJ2xvZycgPyAnbGluZWFyJyA6ICdsb2cnO1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5MT0dfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICB9O1xuICAgICAgICBzY29wZS5sb2cuYWN0aXZlID0gZnVuY3Rpb24oc3BlYywgZW5jVHlwZSkge1xuICAgICAgICAgIGlmICghc2NvcGUubG9nLnN1cHBvcnQoc3BlYywgZW5jVHlwZSkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICB2YXIgZmllbGQgPSBzcGVjLmVuY29kaW5nW2VuY1R5cGVdLFxuICAgICAgICAgICAgc2NhbGUgPSBmaWVsZC5zY2FsZSA9IGZpZWxkLnNjYWxlIHx8IHt9O1xuXG4gICAgICAgICAgcmV0dXJuIHNjYWxlLnR5cGUgPT09ICdsb2cnO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBTT1JUXG5cbiAgICAgICAgdmFyIHRvZ2dsZVNvcnQgPSBzY29wZS50b2dnbGVTb3J0ID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TT1JUX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcbiAgICAgICAgICB2bC5FbmNvZGluZy50b2dnbGVTb3J0KHNwZWMpO1xuICAgICAgICB9O1xuICAgICAgICAvL0ZJWE1FXG4gICAgICAgIHRvZ2dsZVNvcnQuc3VwcG9ydCA9IHZsLkVuY29kaW5nLnRvZ2dsZVNvcnQuc3VwcG9ydDtcblxuICAgICAgICAvLyBUT0dHTEUgRklMVEVSXG5cbiAgICAgICAgc2NvcGUudG9nZ2xlRmlsdGVyTnVsbCA9IGZ1bmN0aW9uKHNwZWMsIHN0YXRzKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLk5VTExfRklMVEVSX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcblxuICAgICAgICAgIHZsLkVuY29kaW5nLnRvZ2dsZUZpbHRlck51bGxPKHNwZWMsIHN0YXRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgc2NvcGUudG9nZ2xlRmlsdGVyTnVsbC5zdXBwb3J0ID0gdmwuRW5jb2RpbmcudG9nZ2xlRmlsdGVyTnVsbE8uc3VwcG9ydDtcblxuICAgICAgICB2YXIgZGVidWdQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy5kZXYtdG9vbCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcuZmEtd3JlbmNoJylbMF0sXG4gICAgICAgICAgcG9zaXRpb246ICdib3R0b20gcmlnaHQnLFxuICAgICAgICAgIG9wZW5PbjogJ2NsaWNrJyxcbiAgICAgICAgICBjb25zdHJhaW5Ub1dpbmRvdzogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS50b2dnbGVTb3J0Q2xhc3MgPSBmdW5jdGlvbih2bFNwZWMpIHtcbiAgICAgICAgICB2YXIgZGlyZWN0aW9uID0gdmxTcGVjICYmIHZsLkVuY29kaW5nLnRvZ2dsZVNvcnQuZGlyZWN0aW9uKHZsU3BlYyksXG4gICAgICAgICAgICBtb2RlID0gdmxTcGVjICYmIHZsLkVuY29kaW5nLnRvZ2dsZVNvcnQubW9kZSh2bFNwZWMpO1xuXG4gICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ3knKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9kZSA9PT0gJ1EnID8gJ2ZhLXNvcnQtYW1vdW50LWRlc2MnIDpcbiAgICAgICAgICAgICAgJ2ZhLXNvcnQtYWxwaGEtYXNjJztcbiAgICAgICAgICB9IGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gJ3gnKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9kZSA9PT0gJ1EnID8gJ2ZhLXNvcnQtYW1vdW50LWRlc2Mgc29ydC14JyA6XG4gICAgICAgICAgICAgICdmYS1zb3J0LWFscGhhLWFzYyBzb3J0LXgnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJ2ludmlzaWJsZSc7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5UUkFOU1BPU0VfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICAgIHZsLkVuY29kaW5nLnRyYW5zcG9zZShzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5jaGFydCA9IG51bGw7XG4gICAgICAgICAgZGVidWdQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2NvbXBhY3RKU09OJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoaW5wdXQsIG51bGwsICcgICcsIDgwKTtcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmVuY29kZVVyaVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZW5jb2RlVXJpXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdlbmNvZGVVUkknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5lbmNvZGVVUkkoaW5wdXQpO1xuICAgIH07XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdzY2FsZVR5cGUnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHZhciBzY2FsZVR5cGVzID0ge1xuICAgICAgICBROiAnUXVhbnRpdGF0aXZlJyxcbiAgICAgICAgTjogJ05vbWluYWwnLFxuICAgICAgICBPOiAnT3JkaW5hbCcsXG4gICAgICAgIFQ6ICdUaW1lJ1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHNjYWxlVHlwZXNbaW5wdXRdO1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIGZhY2V0ZWR2aXouZmlsdGVyOnJlcG9ydFVybFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcmVwb3J0VXJsXG4gKiBGaWx0ZXIgaW4gdGhlIGZhY2V0ZWR2aXouXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigncmVwb3J0VXJsJywgZnVuY3Rpb24gKGNvbXBhY3RKU09ORmlsdGVyLCBfLCBjb25zdHMpIHtcbiAgICBmdW5jdGlvbiB2b3lhZ2VyUmVwb3J0KHBhcmFtcykge1xuICAgICAgdmFyIHVybCA9ICdodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kLzFUOVpBMTRGM21tenJIUjdKSlZVS3lQWHpyTXFGNTRDakxJT2p2MkU3WkVNL3ZpZXdmb3JtPyc7XG5cbiAgICAgIGlmIChwYXJhbXMuZmllbGRzKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihfLnZhbHVlcyhwYXJhbXMuZmllbGRzKSkpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEyNDUxOTk0Nzc9JyArIHF1ZXJ5ICsgJyYnO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLmVuY29kaW5nKSB7XG4gICAgICAgIHZhciBlbmNvZGluZyA9IF8ub21pdChwYXJhbXMuZW5jb2RpbmcsICdjb25maWcnKTtcbiAgICAgICAgZW5jb2RpbmcgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoZW5jb2RpbmcpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMzIzNjgwMTM2PScgKyBlbmNvZGluZyArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5lbmNvZGluZzIpIHtcbiAgICAgICAgdmFyIGVuY29kaW5nMiA9IF8ub21pdChwYXJhbXMuZW5jb2RpbmcyLCAnY29uZmlnJyk7XG4gICAgICAgIGVuY29kaW5nMiA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihlbmNvZGluZzIpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS44NTMxMzc3ODY9JyArIGVuY29kaW5nMiArICcmJztcbiAgICAgIH1cblxuICAgICAgdmFyIHR5cGVQcm9wID0gJ2VudHJ5LjE5NDAyOTI2Nzc9JztcbiAgICAgIHN3aXRjaCAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgY2FzZSAndmwnOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdWaXN1YWxpemF0aW9uK1JlbmRlcmluZysoVmVnYWxpdGUpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ZyJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrQWxnb3JpdGhtKyhWaXNyZWMpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Z2JzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrVUkrKEZhY2V0ZWRWaXopJic7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmx1aVJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xeEtzLXFHYUxaRVVmYlRtaGRtU29TMTNPS09FcHV1X05OV0U1VEFBbWxfWS92aWV3Zm9ybT8nO1xuICAgICAgaWYgKHBhcmFtcy5lbmNvZGluZykge1xuICAgICAgICB2YXIgZW5jb2RpbmcgPSBfLm9taXQocGFyYW1zLmVuY29kaW5nLCAnY29uZmlnJyk7XG4gICAgICAgIGVuY29kaW5nID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKGVuY29kaW5nKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTI0NTE5OTQ3Nz0nICsgZW5jb2RpbmcgKyAnJic7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHJldHVybiBjb25zdHMuYXBwSWQgPT09ICd2b3lhZ2VyJyA/IHZveWFnZXJSZXBvcnQgOiB2bHVpUmVwb3J0O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjp1bmRlcnNjb3JlMnNwYWNlXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyB1bmRlcnNjb3JlMnNwYWNlXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCd1bmRlcnNjb3JlMnNwYWNlJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgIHJldHVybiBpbnB1dCA/IGlucHV0LnJlcGxhY2UoL18rL2csICcgJykgOiAnJztcbiAgICB9O1xuICB9KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=