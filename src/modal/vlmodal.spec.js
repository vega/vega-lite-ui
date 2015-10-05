'use strict';

/* global vl:true */

describe('Directive: vlModal', function () {
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

  afterEach(inject(function(VlModals) {
    // Remove any modals registered during the tests
    VlModals.empty();
  }));

  it('registers itself by ID with the vlModals service', inject(function($compile, VlModals) {
    expect(VlModals.count()).to.equal(0);
    var $el = angular.element('<vl-modal id="test-modal-id"></vl-modal>');
    element = $compile($el)(scope);
    scope.$digest();
    expect(VlModals.count()).to.equal(1);
  }));

  describe('when compiled', function() {
    beforeEach(inject(function($compile) {
      var $el = angular.element('<vl-modal id="test-modal"><h1>Modal Contents</h1></vl-modal>');
      element = $compile($el)(scope);
      scope.$digest();
    }));

    it('does not initially show its contents', function() {
      expect(element.find('h1').length).to.equal(0);
    });

    describe('when opened', function() {
      beforeEach(inject(function(VlModals) {
        VlModals.open('test-modal');
        scope.$digest();
      }));

      it('shows its contents', inject(function(VlModals) {
        expect(element.find('h1').length).to.equal(1);
      }));

      it('hides its contents when closed', inject(function(VlModals) {
        expect(element.find('h1').length).to.equal(1);
        VlModals.close('test-modal');
        scope.$digest();
        expect(element.find('h1').length).to.equal(0);
      }));
    });
  });

});
