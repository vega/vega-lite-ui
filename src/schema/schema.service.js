'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', function() {
    var Schema = {};

    Schema.schema = dl.json('bower_components/vega-lite/vega-lite-schema.json');

    Schema.getChannelSchema = function(channel) {
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      var ref = encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref;
      var def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  });
