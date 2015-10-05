'use strict';

/* global vl:true */

describe('Directive: bookmarkList', function () {
  var element,
    scope;

  afterEach(inject(function(Modals) {
    // Remove any modals registered during the tests
    Modals.empty();
  }));

  beforeEach(module('vlui', function($provide) {
    // mock vega lite
    $provide.constant('vl', vl);
  }));

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
    scope.active = true;
  }));

  it('requires a parent modal directive', inject(function ($compile) {
    // This is a side-effect of the modalCloseButton directive inside bookmarkList
    element = angular.element('<bookmark-list></bookmark-list>');
    expect(function() {
      $compile(element)(scope);
    }).to.throw;
    element = angular.element('<modal><bookmark-list></bookmark-list></modal>');
    expect(function() {
      $compile(element)(scope);
    }).not.to.throw;
  }));

  describe('when opened', function() {
    beforeEach(inject(function(Modals, $compile) {
      var template = '<modal id="test-bookmarks"><bookmark-list></bookmark-list></modal>';
      element = $compile(angular.element(template))(scope);
      Modals.open('test-bookmarks');
      scope.$digest();
    }));

    // TODO: Tests that validate the directive works properly
  });
});
