'use strict';

/* global vl:true */

describe('Directive: bookmarkList', function () {
  var element,
    scope;

  afterEach(inject(function(VlModals) {
    // Remove any modals registered during the tests
    VlModals.empty();
  }));

  beforeEach(module('vlui', function($provide) {
    // mock vega lite
    $provide.constant('vl', vl);
  }));

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
    scope.active = true;
  }));

  it('requires a parent vlModal directive', inject(function ($compile) {
    element = angular.element('<bookmark-list></bookmark-list>');
    expect(function() {
      $compile(element)(scope);
    }).to.throw;
    element = angular.element('<vl-modal><bookmark-list></bookmark-list></vl-modal>');
    expect(function() {
      $compile(element)(scope);
    }).not.to.throw;
  }));

  describe('when opened', function() {
    beforeEach(inject(function(VlModals, $compile) {
      var template = '<vl-modal id="test-bookmarks"><bookmark-list></bookmark-list></vl-modal>';
      element = $compile(angular.element(template))(scope);
      VlModals.open('test-bookmarks');
      scope.$digest();
    }));

    // TODO: Tests that validate the directive works properly
  });
});
