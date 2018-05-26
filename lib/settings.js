'use strict';

module.exports = {
  quiet: true,
  storeBody: false,
  log: console,
  format: 'chrome-tracing',
  file: 'tohu.json',

  setup
};

function setup(addons) {
  Object.assign(module.exports, addons);
}