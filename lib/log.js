'use strict';

const settings = require('./settings');

[
  'error',
  'info',
  'debug'
].forEach(level => {
  module.exports[level] = function() {
    if (!settings.quiet) {
      settings.log[level](...arguments);
    }
  };
});

