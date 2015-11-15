'use strict';

describe('Directive: addMyriaDataset', function () {

  // load the directive's module
  beforeEach(module('vlui'));

  var element,
    scope, $httpBackend, searchRequestHandler;

  beforeEach(inject(function ($rootScope, $injector, consts) {
    scope = $rootScope.$new();

    $httpBackend = $injector.get('$httpBackend');
    // backend definition common for all tests
    searchRequestHandler = $httpBackend
      .when('GET', consts.myriaRest + '/dataset/search/?q=')
      .respond(200, []);
  }));

  it('should show correct form', inject(function ($compile) {
    element = angular.element('<add-myria-dataset></add-myria-dataset>');
    element = $compile(element)(scope);

    scope.$digest();

    $httpBackend.flush();
    expect(element.find('input').length).to.eql(1);
    expect(element.find('button').length).to.eql(2);
  }));
});
