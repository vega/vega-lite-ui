'use strict';

describe('Service: Alerts', function() {

  // load the service's module
  beforeEach(module('vlui'));

  // instantiate service
  var alerts, $timeout;
  beforeEach(inject(function(_Alerts_, _$timeout_) {
    alerts = _Alerts_;
    $timeout = _$timeout_;
  }));

  it('should add alerts', function() {
    expect(alerts.alerts).to.eql([]);
    alerts.add('foo');
    expect(alerts.alerts).to.eql([{msg: 'foo'}]);
    alerts.add('bar');
    expect(alerts.alerts).to.eql([{msg: 'foo'}, {msg: 'bar'}]);
    alerts.closeAlert(0);
    expect(alerts.alerts).to.eql([{msg: 'bar'}]);
  });

  it('alerts should close themselves', function() {
    expect(alerts.alerts).to.eql([]);
    alerts.add('foo', 100);
    expect(alerts.alerts).to.eql([{msg: 'foo'}]);
    $timeout.flush();
    expect(alerts.alerts).to.eql([]);
  });

});
