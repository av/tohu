'use strict';

const url = require('url');

module.exports = {
  format: 'chrome-tracing',
  convert: events => {
    return {
      'traceEvents': Object.keys(events)
        .map(id => toChromeTracingEvent(events[id]))
        .reduce((acc, [a, b]) => acc.concat(a, b), []),
      'displayTimeUnit': 'ms'  
    };
  }
};

/**
 * @typedef {Object} ChromeTracingEvent
 * @prop {String} id - unique identifier for event
 * @prop {Number} pid - process id
 * @prop {Number} tid - thread id
 * @prop {String} cat - event category
 * @prop {Number} ts - timstamp in microseconds
 * @prop {String} ph - phase, 'b' for beginning event, 'e' for ending
 * @prop {String} name - event title
 * @prop {Object} args - additional metadata
 */

/**
 * Converts given tohu event to pair of Async Chrome:Tracing events
 * 
 * @param {TohuEvent} event
 * @returns {ChromeTracingEvent[]} 
 */
function toChromeTracingEvent(event) {
  const parsed = url.parse(event.meta.url);
  const endpoint = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : '' }${parsed.pathname}`;
  const base = {
    id: event.id,
    pid: process.pid,
    tid: 0,
    cat: event.type,
    name: `${event.meta.method} ${endpoint}`,
    args: event.meta
  };

  return [
    Object.assign({}, base, {
      ph: 'b',
      ts: event.start * 1000
    }),
    Object.assign({}, base, {
      ph: 'e',
      ts: event.stop * 1000
    })
  ];
}