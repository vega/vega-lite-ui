'use strict';
/* globals window, angular */

angular.module('vlui', [
  'LocalStorageModule',
  'ui.select',
  'angular-websql'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('dl', window.dl)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  // Papa
  .constant('Papa', window.Papa)
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  // Drop
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: false,
    defaultConfigSet: 'large',
    appId: 'vlui',
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753'
  });
  // .config(function(uiZeroclipConfigProvider) {
  //   // config ZeroClipboard
  //   uiZeroclipConfigProvider.setZcConf({
  //     swfPath: 'bower_components/zeroclipboard/dist/ZeroClipboard.swf'
  //   });
  // });
