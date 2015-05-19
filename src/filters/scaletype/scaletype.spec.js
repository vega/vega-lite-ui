'use strict';

describe('Filter: scaleType', function() {

  // load the filter's module
  beforeEach(module('vlui'));

  // initialize a new instance of the filter before each test
  var scaleType;
  beforeEach(inject(function($filter) {
    scaleType = $filter('scaleType');
  }));

  it('should return correct name"', function() {
    expect(scaleType('Q')).to.eql('Quantitative');
    expect(scaleType('O')).to.eql('Ordinal');
    expect(scaleType('T')).to.eql('Time');
  });

});
