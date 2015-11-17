'use strict';

/* global vl:true */

describe('Directive: modal', function () {
  var element,
    scope;

  beforeEach(module('vlui', function($provide) {
    // mock vega lite
    $provide.constant('vl', vl);
  }));

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
    scope.active = true;
  }));

  afterEach(inject(function(Modals) {
    // Remove any modals registered during the tests
    Modals.empty();
  }));

  it('registers itself by ID with the Modals service', inject(function($compile, Modals) {
    expect(Modals.count()).to.equal(0);
    var $el = angular.element('<modal id="test-modal-id"></modal>');
    element = $compile($el)(scope);
    scope.$digest();
    expect(Modals.count()).to.equal(1);
  }));

  describe('when compiled', function() {
    var compileTemplate;

    beforeEach(inject(function($compile) {
      compileTemplate = function(template, scope) {
        element = $compile(angular.element(template))(scope);
        scope.$digest();
        return element;
      };
    }));

    it('does not initially show its contents', function() {
      element = compileTemplate('<modal><h1>Modal Contents</h1></modal>', scope);
      expect(element.find('h1').length).to.equal(0);
    });

    describe('when opened', function() {
      beforeEach(inject(function(Modals) {
        element = compileTemplate('<modal id="test-modal"><h1>Modal Contents</h1></modal>', scope);
        Modals.open('test-modal');
        scope.$digest();
      }));

      it('shows its contents', function() {
        expect(element.find('h1').length).to.equal(1);
      });

      it('hides its contents when closed', inject(function(Modals) {
        expect(element.find('h1').length).to.equal(1);
        Modals.close('test-modal');
        scope.$digest();
        expect(element.find('h1').length).to.equal(0);
      }));
    });

    describe('auto-open attribute', function() {
      it('opens modal by default if value is truthy', function() {
        element = compileTemplate('<modal auto-open="true"><h1>Contents</h1></modal>', scope);
        expect(element.find('h1').length).to.equal(1);
      });

      it('does not open modal by default if value is falsy', function() {
        element = compileTemplate('<modal auto-open="false"><h1>Contents</h1></modal>', scope);
        expect(element.find('h1').length).to.equal(0);
      });

      it('has no effect if no value is provided', function() {
        element = compileTemplate('<modal auto-open=""><h1>Contents</h1></modal>', scope);
        expect(element.find('h1').length).to.equal(0);
      });

      it('can be data-bound to a truthy scope property', function() {
        scope.scopeProp = true;
        element = compileTemplate('<modal auto-open="scopeProp"><h1>Contents</h1></modal>', scope);
        expect(element.find('h1').length).to.equal(1);
      });

      it('can be data-bound to a falsy scope property', function() {
        scope.scopeProp = false;
        element = compileTemplate('<modal auto-open="scopeProp"><h1>Contents</h1></modal>', scope);
        expect(element.find('h1').length).to.equal(0);
      });
    });
  });

});
