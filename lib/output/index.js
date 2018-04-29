'use strict';

[
  require('./chrome-tracing')
]
  .forEach(exporter => {
    module.exports[exporter.format] = exporter.convert;
  });