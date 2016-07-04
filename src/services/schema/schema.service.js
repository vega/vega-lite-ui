'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', function(vg, vl, vlSchema, ANY) {
    var Schema = {};

    Schema.schema = vlSchema;

    Schema.getChannelSchema = function(channel) {
      var def = null;
      if (channel === ANY) {
        def = 'FieldDef'; // just use the generic version
      } else {
        var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
        // for detail, just get the flat version
        var ref = encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref;
        def = ref.slice(ref.lastIndexOf('/')+1);
      }
      return Schema.schema.definitions[def];
    };

    return Schema;
  });
