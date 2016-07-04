'use strict';

/* global vl:true, vg:true */

describe('Directive: vlPlot', function() {

  // load the directive's module
  beforeEach(module('vlui'));

  var element,
    scope;

  beforeEach(module('vlui', function($provide) {
    // mock vega
    $provide.constant('vg', {
      parse: {
        spec: function(spec, callback) {
          callback(function(opt) {
            // jshint unused:false
            element.append('<div></div>');
            return {
              width: function() {},
              height: function() {},
              update: function() {},
              renderer: function() {},
              on: function() {}
            };
          });
        }
      },
      util: vg.util
    });
    $provide.constant('vl', vl);
  }));

  beforeEach(inject(function($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should attach visualization', inject(function($compile) {
    element = angular.element('<vl-plot chart="{vlSpec:{mark:\'point\', config:{}}}"></vl-plot>');
    element = $compile(element)(scope);
    scope.$digest();
    expect(element.attr('class')).to.eql('vl-plot ng-isolate-scope');
  }));
});
