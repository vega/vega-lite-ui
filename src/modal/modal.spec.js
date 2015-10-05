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
    beforeEach(inject(function($compile) {
      var $el = angular.element('<modal id="test-modal"><h1>Modal Contents</h1></modal>');
      element = $compile($el)(scope);
      scope.$digest();
    }));

    it('does not initially show its contents', function() {
      expect(element.find('h1').length).to.equal(0);
    });

    describe('when opened', function() {
      beforeEach(inject(function(Modals) {
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
  });

});
