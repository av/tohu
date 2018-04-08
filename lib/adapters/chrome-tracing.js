'use strict';

module.exports = events => {
  return {
    'traceEvents': Object.keys(events)
      .map(id => toChromeTracingEvent(events[id]))
  };
};

module.exports.format = 'chrome';

function toChromeTracingEvent(event) {
  return {
    pid: 1,
    tid: 1,
    ts: event.start * 1000,
    dur: event.duration * 1000,
    ph: 'X',
    name: event.meta.url,
    args: event.meta
  };
}