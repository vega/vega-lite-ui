'use strict';
/* global vl:true */

describe('Service: Config', function() {

  var Config, scope;

  // load the service's module
  beforeEach(module('vlui'));

  beforeEach(module('vlui', function($provide) {
    $provide.constant('vl', vl); // vl is loaded by karma
  }));

  // instantiate service
  beforeEach(inject(function($rootScope, _Config_) {
    scope = $rootScope.$new();
    Config = _Config_;
  }));

  it('should have correct config ', function() {
    var config = {
      cell: {
        width: 400,
        height: 400
      },
      facet: {
        cell: {
          width: 200,
          height: 200
        }
      }
    };

    expect(Config.large()).to.eql(config);
  });

});
