'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.list = [];
      this.length = 0;
      this.isSupported = localStorageService.isSupported;

      this.clearDeprecatedBookmarks();
    };

    var proto = Bookmarks.prototype;

    proto.updateLength = function() {
      this.length = this.list.length;
    };

    proto.save = function() {
      localStorageService.set('bookmarks', this.list);
    };

    proto.load = function() {
      this.list = localStorageService.get('bookmarks') || [];
      this.updateLength();
    };

    /**
     * Clear deprecated bookmarks in localStorage. 
     * We switched from this.list = {} to this.list = [],
     * this.list = {} may be still in localStorage and cause problems on this.load() 
     * This function is mostly beneficial to developers working on this repo.
     */
    proto.clearDeprecatedBookmarks = function() {
      if ( localStorageService.keys().includes('bookmarks') &&
        localStorageService.get('bookmarks').constructor !== Array ) {
          localStorageService.remove('bookmarks'); // remove deprecated bookmarks where this.list === {}
          this.save(); // save new bookmarks where this.list === []
      }
    }

    proto.clear = function() {
      this.list.splice(0, this.list.length);
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.toggle = function(chart) {

      var shorthand = chart.shorthand;

      if (this.isBookmarked(shorthand)) {
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

      this.list.push({shorthand: shorthand, chart: _.cloneDeep(chart)});

      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      var index = this.list.findIndex(function(bookmark) { return bookmark.shorthand === shorthand; });
      if (index >= 0) {
        this.list.splice(index, 1);
      }
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.reorder = function() {
      this.save();
  }

    proto.isBookmarked = function(shorthand) {
      return _.some(this.list, function(bookmark) { return bookmark.shorthand === shorthand; });
    };

    return new Bookmarks();
  });
