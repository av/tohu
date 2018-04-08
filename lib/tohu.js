'use strict';

const utils = require('./utils');

class Tohu {
  constructor() {
    this.reset();
    this.instrumentHttp();

    this.listening = true;
  }

  /**
   * Reset current tracker instance
   */
  reset() {
    this.listening = false;
    this.events = {};
  }

  /**
   * Injects http request interceptors
   */
  instrumentHttp() {
    const originalRequest = http.request;

    http.request = (opts, cb) => {
      const req = originalRequest.call(http, opts, cb);
      const url = Tracker.getRequestUrl(opts);
      const headers = req.headers;
      const method = opts.method;
      const id = this.start('http-call', { url, method, headers });
      const originalWrite = req.write;
      let data = '';

      req.write = function() {
        data += arguments[0];
        originalWrite.apply(req, arguments);
      };

      req.on('error', err => {
        this.stop(id, {
          success: false,
          error: errorToString(err)
        });
      });
      req.on('response', res => {
        let socket = req.socket || {};

        this.stop(id, {
          success: true,
          bytesRead: socket.bytesRead,
          bytesWritten: socket.bytesWritten,
          response: `${res.statusCode} ${res.statusMessage}`,
          data
        });
      });

      return req;
    };
  }

  /**
   * Starts event of given type
   *
   * @param {String} type
   * @param {*} [meta] meta for type handler
   * @return {IdString} id of started event
   */
  start(type, meta) {
    if (this.listening) {
      let event = {
        type,
        id: utils.generateId(16),
        start: Date.now()
      };

      event.meta = meta;

      this.events[event.id] = event;
      return event.id;
    }
  }

  /**
   * Stops tracking event with given id
   *
   * @param {String} id
   * @param {Object} [meta] additional data to store on event
   * @return {*}
   */
  stop(id, meta) {
    if (this.listening && this.events[id]) {
      let event = this.events[id];

      event.stop = Date.now();
      event.duration = event.stop - event.start;

      if (meta && event.meta) {
        Object.assign(event.meta, meta);
      }

      return event;
    }
  }

}

module.exports = Tohu;