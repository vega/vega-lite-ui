'use strict';

/* global vl:true */

describe('Directive: modalCloseButton', function () {
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

  it('requires a parent modal directive', inject(function ($compile) {
    element = angular.element('<modal-close-button></modal-close-button>');
    expect(function() {
      $compile(element)(scope);
    }).to.throw;
    element = angular.element('<modal><modal-close-button></modal-close-button></modal>');
    expect(function() {
      $compile(element)(scope);
    }).not.to.throw;
  }));

  describe('when parent modal is open', function() {
    beforeEach(inject(function ($compile, Modals) {
      // Render modal
      element = angular.element('<modal id="button-parent"><modal-close-button></modal-close-button></modal>');
      element = $compile(element)(scope);
      scope.$digest();
      // Open modal to render button
      Modals.open('button-parent');
      scope.$digest();
    }));

    it('renders a close link', function() {
      expect(element.find('a').length).to.equal(1);
      expect(element.find('a').text()).to.equal('Close');
    });

    it('closes parent modal when clicked', function() {
      element.find('a').triggerHandler('click');
      expect(element.find('a').length).to.equal(0);
    });
  });

  it('fires an on-close callback method, if one is provided', inject(function($compile, Modals) {
    var cbHasFired = false;
    element = angular.element('<modal id="button-parent"><modal-close-button close-action="someCb()"></modal-close-button></modal>');
    scope.someCb = function() {
      cbHasFired = true;
    };
    element = $compile(element)(scope);
    scope.$digest();
    // Open modal to render button
    Modals.open('button-parent');
    scope.$digest();
    expect(cbHasFired).to.be.false;
    element.find('a').triggerHandler('click');
    expect(cbHasFired).to.be.true;
  }));

});
