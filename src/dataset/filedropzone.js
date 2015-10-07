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
  .directive('fileDropzone', function (Modals, Alerts, FileReader) {

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
          // element.addClass('hover');
        });

        element.on('drop dragleave dragout', function onDragExit(event) {
          // element.removeClass('hover');
        });

        element.on('drop', function onDrop(event) {
          var file, reader;
          if (event) {
            event.preventDefault();
          }
          file = event.originalEvent.dataTransfer.files[0];

          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            return;
          }

          reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              scope.dataset.name = file.name;
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        });
      }

    };
  });
