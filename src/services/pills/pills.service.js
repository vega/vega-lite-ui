'use strict';

angular.module('vlui')
  .service('Pills', function () {
    var Pills = {
      // Functions
      get: get,
      // Event
      dragStart: dragStart,
      dragStop: dragStop,
      // Event, with handler in the listener
      set: set,
      remove: remove,
      update: update,
      reset: reset,
      dragDrop: dragDrop,

      // Data
      // TODO: split between encoding related and non-encoding related
      pills: {},
      /** pill being dragged */
      dragging: null,
      /** channelId that's the pill is being dragged from */
      cidDragFrom: null,
      /** Listener  */
      listener: null
    };

    /**
     * Set a fieldDef of a pill of a given channelId
     * @param channelId channel id of the pill to be updated
     * @param fieldDef fieldDef to to be updated
     * @param update whether to propagate change to the channel update listener
     */
    function set(channelId, fieldDef, update) {
      Pills.pills[channelId] = fieldDef;

      if (update && Pills.listener) {
        Pills.listener.set(channelId, fieldDef);
      }
    }

    /**
     * Get a fieldDef of a pill of a given channelId
     */
    function get(channelId) {
      return Pills.pills[channelId];
    }

    function remove(channelId) {
      delete Pills.pills[channelId];
      if (Pills.listener) {
        Pills.listener.remove(channelId);
      }
    }
    /**
     * Update the whole pill set
     *
     * @param {any} spec
     */
    function update(spec) {
      if (Pills.listener) {
        Pills.listener.update(spec);
      }
    }


    /** Reset Pills */
    function reset() {
      if (Pills.listener) {
        Pills.listener.reset();
      }
    }

    /**
     * @param {any} pill pill being dragged
     * @param {any} cidDragFrom channel id that the pill is dragged from
     */
    function dragStart(pill, cidDragFrom) {
      Pills.dragging = pill;
      Pills.cidDragFrom = cidDragFrom;
    }

    /** Stop pill dragging */
    function dragStop() {
      Pills.dragging = null;
    }

    /**
     * When a pill is dropped
     * @param cidDragTo  channelId that's the pill is being dragged to
     */
    function dragDrop(cidDragTo) {
      if (Pills.listener) {
        Pills.listener.dragDrop(cidDragTo, Pills.cidDragFrom);
      }
    }

    return Pills;
  });
