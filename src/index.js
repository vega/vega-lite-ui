'use strict';
/* globals window */

angular.module('vlui', [])
  .constant('_', window._)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  .constant('Papa', window.Papa)
  .constant('dl', window.dl);
  // .constant('consts', {
  //   addCount: true, // add count field to Dataset.dataschema
  //   debug: true,
  //   useUrl: true,
  //   logging: false,
  //   defaultConfigSet: 'large',
  //   appId: 'polestar'
  // })
  // .config(function(uiZeroclipConfigProvider) {
  //   // config ZeroClipboard
  //   uiZeroclipConfigProvider.setZcConf({
  //     swfPath: 'bower_components/zeroclipboard/dist/ZeroClipboard.swf'
  //   });
  // });
