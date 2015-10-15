'use strict';

describe('Directive: alertMessages', function() {

  var element,
    scope;

  // load the directive's module
  beforeEach(module('vlui'));

  beforeEach(inject(function($rootScope, $compile, Alerts) {
    Alerts.add('foo');
    Alerts.add('bar');
    scope = $rootScope.$new();
    var $el = angular.element('<alert-messages></alert-messages>');
    element = $compile($el)(scope);
    scope.$digest();
  }));

  it('should show alert messages', function() {
    expect(element.find('.alert-item').length).to.equal(2);
  });

  it('should display the alert messages', function() {
    // Ignore the close buttons, which use an HTML entity for the close icon
    element.find('a').remove();
    expect(element.find('.alert-item').eq(0).text().trim()).to.equal('foo');
    expect(element.find('.alert-item').eq(1).text().trim()).to.equal('bar');
  });

  it('should remove a messagea when the close icon is clicked', function() {
    element.find('.alert-item').eq(0).find('a').triggerHandler('click');
    scope.$digest();
    expect(element.find('.alert-item').length).to.equal(1);
    element.find('a').remove();
    expect(element.find('.alert-item').eq(0).text().trim()).to.equal('bar');
  });
});
