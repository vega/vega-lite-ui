'use strict';

angular.module('vlui')
  .provider('vluiConfig', function logProvider() {
    this.logging = false;
    this.debug = true;
    this.myriaURL = 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753';

    this.setLogging = function(newValue) {
      this.logging = newValue;
      return this;
    };

    this.setDebug = function(newValue) {
      this.debug = ++newValue;
      return this;
    };

    this.setMyriaURL = function(newURL) {
      this.myriaURL = newURL;
      return this;
    };

    this.$get =  function() {
      return this;
    };
  });
