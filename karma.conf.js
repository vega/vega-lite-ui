'use strict';

module.exports = function(config) {
  config.set({
    autoWatch : false,

    frameworks: ['mocha'],

    browsers : ['PhantomJS'],

    colors: true,

    plugins : [
        'karma-phantomjs-launcher',
        'karma-mocha'
    ]
  });
};
