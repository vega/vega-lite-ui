'use strict';

describe('Directive: alertMessages', function() {

  var element,
    scope;

  // load the directive's module
  beforeEach(module('vlui', function($provide) {
    // Mock the alerts service
    $provide.value('Alerts', {
      alerts: [
        {msg: 'foo'},
        {msg: 'bar'}
      ]
    });
  }));

  beforeEach(inject(function($rootScope, $compile) {
    scope = $rootScope.$new();
    var $el = angular.element('<alert-messages></alert-messages>');
    element = $compile($el)(scope);
    scope.$digest();
  }));

  it('should show alert messages', function() {
    expect(element.find('.alert-item').length).to.equal(2);
    // Ignore the close buttons, which use an HTML entity for the close icon
    element.find('a').remove();
    expect(element.find('.alert-item').eq(0).text().trim()).to.equal('foo');
    expect(element.find('.alert-item').eq(1).text().trim()).to.equal('bar');
  });
});
