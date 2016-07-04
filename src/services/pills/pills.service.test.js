'use strict';

/* jshint expr:true */

describe('Service: Pills', function () {

  // load the service's module
  beforeEach(module('vlui', function() {
  }));

  // instantiate service
  var Pills;
  beforeEach(inject(function (_Pills_) {
    Pills = _Pills_;
  }));

  it('should do something', function () {
    expect(Pills).to.be.ok;
  });

});