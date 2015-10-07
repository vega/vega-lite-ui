'use strict';

/* global vl:false */

describe('Directive: tab', function () {
  var element,
    scope,
    renderTemplate;

  // Load vlui
  beforeEach(module('vlui', function($provide) {
    // mock vega lite
    $provide.constant('vl', vl);
  }));

  beforeEach(inject(function ($rootScope, $compile) {
    scope = $rootScope.$new();

    // Reduce duplication in test code
    renderTemplate = function(template, scope) {
      if ( ! scope ) { throw new Error('renderTemplate called without scope'); }
      var compiledElement = $compile(angular.element(template))(scope);
      scope.$digest();
      return compiledElement;
    };
  }));

  it('requires a parent tabset directive', function() {
    expect(function() {
      renderTemplate('<tab></tab>', scope);
    }).to.throw;
    expect(function() {
      renderTemplate('<tabset><tab></tab></tabset>', scope);
    }).not.to.throw;
  });

  it('renders a tabbed interface', function() {
    element = renderTemplate('<tabset><tab>Tab 1</tab><tab>Tab 2</tab></tabset>', scope);
    expect(element.find('.tab').length).to.equal(2);
  });

  it('labels tabs by their directive heading attribute', function() {
    element = renderTemplate('<tabset><tab heading="tab heading">Tab Contents</tab></tabset>', scope);
    expect(element.find('.tab').text()).to.equal('tab heading');
  });

  it('can data-bind the heading attribute', function() {
    scope.tabhead = 'tab heading';
    element = renderTemplate('<tabset><tab heading="{{tabhead}}">Tab Contents</tab></tabset>', scope);
    expect(element.find('.tab').text()).to.equal('tab heading');
    scope.tabhead = 'new tab heading';
    scope.$digest();
    expect(element.find('.tab').text()).to.equal('new tab heading');
  });

  it('transcludes the content within the tab', function() {
    element = renderTemplate('<tabset><tab>Tab Contents</tab></tabset>', scope);
    expect(element.find('.tab-contents').text()).to.equal('Tab Contents');
  });

  it('auto-activates the first tab', function() {
    element = renderTemplate('<tabset><tab>Tab 1</tab><tab>Tab 2</tab></tabset>', scope);
    expect(element.find('.tab-contents').text()).to.equal('Tab 1');
  });

  it('displays the relevant content when a tab is clicked', function() {
    element = renderTemplate('<tabset><tab heading="tab1">Tab 1</tab><tab heading="tab2">Tab 2</tab><tab heading="tab2">Tab 3</tab></tabset>', scope);
    element.find('.tab').eq(2).triggerHandler('click');
    expect(element.find('.tab-contents').text()).to.equal('Tab 3');
    element.find('.tab').eq(1).triggerHandler('click');
    expect(element.find('.tab-contents').text()).to.equal('Tab 2');
  });

});
