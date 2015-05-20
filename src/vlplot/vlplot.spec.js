'use strict';

/* global vl:true */

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
      }
    });
    $provide.constant('vl', vl);
  }));

  beforeEach(inject(function($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should attach visualization', inject(function($compile) {
    element = angular.element('<vl-plot vg-spec="{}"></vl-plot>');
    element = $compile(element)(scope);
    scope.$digest();
    console.log(element);
    expect(element.attr('class')).to.eql('vis ng-isolate-scope');
  }));
});
