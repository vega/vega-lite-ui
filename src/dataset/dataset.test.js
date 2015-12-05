
'use strict';

/* global vl*/

describe('Service: Dataset', function() {
  // load the service's module
  beforeEach(module('vlui'));

  beforeEach(module('vlui', function($provide) {
    $provide.constant('vl', vl); // vl is loaded by karma
  }));

  // instantiate service
  var dataset;
  beforeEach(inject(function(_Dataset_) {
    dataset = _Dataset_;
  }));

  it('datasets should be there', function() {
    expect(dataset.dataset).to.be.ok;
    expect(dataset.datasets).to.be.ok;
    expect(dataset.datasets.length).to.equal(11);
  });
});
