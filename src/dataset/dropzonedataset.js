'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:dropzoneDataset
 * @description
 * # dropzoneDataset
 */
angular.module('vlui')
  .directive('dropzoneDataset', function (Dataset, Alerts, dl /*Logger, Config*/) {
    return {
      templateUrl: 'dataset/dropzonedataset.html',
      restrict: 'E',
      replace: true,
      scope: false,  // use scope from datasetSelector
      link: function postLink(scope, element, attrs) {
        scope.dropzoneDataset = {};
        var validMimeTypes = attrs.fileDropzone;

        var processDragOverOrEnter = function(event) {
          if (event != null) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
          return false;
        };

        var checkSize = function(size) {
          var _ref;
          if (((_ref = attrs.maxFileSize) === (void 0) || _ref === '') || (size / 1024) / 1024 < attrs.maxFileSize) {
            return true;
          } else {
            Alerts.add('File must be smaller than ' + attrs.maxFileSize + ' MB');
            return false;
          }
        };

        var isTypeValid = function(type) {
          if ((validMimeTypes === (void 0) || validMimeTypes === '') || validMimeTypes.indexOf(type) > -1) {
            return true;
          } else {
            Alerts.add('Invalid file type.  File must be one of following types ' + validMimeTypes);
            return false;
          }
        };

        // need to give this a unique name because we share the namespace
        scope.addDropped = function() {
          var data = dl.read(scope.dropzoneDataset.data, {type: 'csv'});

          var dataset = {
            id: Date.now(),  // time as id
            name: scope.dropzoneDataset.name,
            values: data,
            group: 'pasted'
          };

          Dataset.dataset = Dataset.add(angular.copy(dataset));
          scope.datasetChanged();

          scope.datasetName = '';
          scope.data = '';

          scope.doneAdd();
        };

        element.bind('dragover', processDragOverOrEnter);
        element.bind('dragenter', processDragOverOrEnter);
        return element.bind('drop', function(event) {
          var file, name, reader, size, type;
          if (event != null) {
            event.preventDefault();
          }
          reader = new FileReader();
          reader.onload = function(evt) {
            if (checkSize(size) && isTypeValid(type)) {
              return scope.$apply(function() {
                scope.dropzoneDataset.data = evt.target.result;
                scope.dropzoneDataset.name = name;
                return true;
              });
            }
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          file = event.originalEvent.dataTransfer.files[0];
          name = file.name;
          type = file.type;
          size = file.size;
          reader.readAsText(file);
          return false;
        });

      }
    };
  });
