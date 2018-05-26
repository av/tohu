'use strict';

const http = require('http');
const utils = require('./utils');
const output = require('./output');
const settings = require('./settings');
const log = require('./log');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} TohuInstrumentation
 * @prop {Object|Function} target - instance of service to be instrumented
 * @prop {TohuHook[]} hooks - methods and meta accessors to override for target
 */

/**
 * @typedef {Object} TohuHook
 * @prop {String} method - name of instrumented method
 * @prop {String} event - name of event to be recorded by tracker
 * @prop {Function} [getMeta] - function extracting event metadata out of method args and context
 */

/**
 * @typedef {Object} TohuEvent
 * @prop {String} id - unique event identifier
 * @prop {Number} start - event start time, ms
 * @prop {Number} stop - event stop time, ms
 * @prop {Number} duration - event duration, ms
 * @prop {Object} meta - additional event data
 */

/**
 * Implements events tracer, instruments required services,
 * holds events and allows to export data in various formats.
 */
class Tohu {

  /**
   * Checks if given hook is valid
   * @param {TohuHook} hook 
   */
  static isValidHook(hook) {
    return hook && hook.method && hook.event;
  }
 
  /**
   * Verifies if given target is instrumentable 
   * 
   * @param {Object|*} target 
   * @param {String} method 
   */
  static isInstumentable(target, method) {
    return target && (typeof target[method] === 'function');
  }

  /**
   * Checks if given target is maybe a constructor, 
   * by verifying it's a callable function
   * 
   * @param {Function|Object} target 
   */
  static maybeConstructor(target) {
    return Object.getOwnPropertyNames(target).every(
      property => ['length', 'name', 'prototype'].includes(property)
    );
  }

  /**
   * Resolve the target for instrumentation based on the
   * input entity. Able to detect plain objects, classes and
   * prototype based anchestor functions
   * 
   * @param {Object|Function} target 
   */
  static resolveTarget(target) {
    if(Tohu.maybeConstructor(target)) {
      return target.prototype || target.constructor.prototype;
    }

    return target;
  }

  /**
   * @constructor
   */
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
   * Proxy for settings setup
   * @returns {*}
   */
  setup() {
    return settings.setup(...arguments);
  }

  /**
   * Injects http request interceptors
   */
  instrumentHttp() {
    const originalRequest = http.request;

    http.request = (opts, cb) => {
      const req = originalRequest.call(http, opts, cb);
      const method = opts.method;
      const headers = req.headers;
      const originalWrite = req.write;
      const url = utils.getRequestUrl(opts);
      const id = this.start('http-call', { url, method, headers });
      let requestBody = '';
      let responseBody = '';

      if (settings.storeBody) {
        req.write = function () {
          requestBody += arguments[0];
          originalWrite.apply(req, arguments);
        };
      }

      req.on('error', err => {
        this.stop(id, {
          success: false,
          error: errorToString(err)
        });
      });

      req.on('response', res => {
        let socket = req.socket || {};

        if (settings.storeBody) {
          res.on('data', chunk => {
            responseBody += String(chunk);
          });
        }

        res.on('end', () => {
          this.stop(id, {
            success: true,
            bytesRead: socket.bytesRead,
            bytesWritten: socket.bytesWritten,
            response: `${res.statusCode} ${res.statusMessage}`,
            requestBody,
            responseBody
          });
        });
      });

      return req;
    };
  }

  /**
   * Instruments services as per given configuration
   * 
   * @param {TohuInstrumentation} config 
   */
  instrument(config) {
    if (Array.isArray(config)) {
      return config.forEach(this.instrument.bind(this));
    }

    try {
      config.hooks.forEach(hook => this.addHook(config.target, hook));
      return true;
    } catch (error) {
      log.error(`Tracker: failed to instrument module ${config.service}`, error);
      return false;
    }
  }

  /**
   * Adds event hook to a given service
   * 
   * @param {Object|Function} service 
   * @param {TohuHook} hook
   */
  addHook(target, hook) {
    target = Tohu.resolveTarget(target);

    if (Tohu.isValidHook(hook) && Tohu.isInstumentable(target, hook.method)) {
      const tohu = this;
      const originalMethod = target[hook.method];

      // Override the hook method with custom function
      // marking the events for tracker
      target[hook.method] = function () {
        let result;
        const eventId = tohu.start(
          hook.event,
          hook.getMeta
            ? hook.getMeta(arguments, this)
            : null
        );

        try {
          result = originalMethod.apply(this, arguments);
        } catch (error) {
          // If original method throws before returning,
          // catch it to stop event with error signature
          tohu.stop(eventId, {
            success: false,
            error: errorToString(error)
          });

          // rethrow to keep the flow as it would
          // be without having tracker at all
          throw error;
        }

        if (result instanceof Promise) {
          // Handle services returning promises
          return result
            .then(
              tohu.handleResolved(eventId),
              tohu.handleRejected(eventId)
            );
        } else {
          // Handle synchronous services
          tohu.stop(eventId);
          return result;
        }
      };

      return true;
    }

    return false;
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

  /**
   * Handles resolution of a promise with stopping the
   * event with associated id
   * 
   * @param {String} id 
   */
  handleResolved(id) {
    return res => {
      this.stop(id);
      return res;
    };
  }

  /**
   * Handles rejection of a tracked promise
   * with stopping the event with given id
   * 
   * @param {String} id 
   */
  handleRejected(id) {
    return error => {
      this.stop(id, {
        success: false, error
      });

      return Promise.reject(err);
    };
  }

  /**
   * Stops all unfinished events
   */
  stopAll() {
    Object.keys(this.events).forEach(eventId => {
      if (!this.events[eventId].stop) {
        this.stop(eventId);
      }
    });
  }

  /**
   * Serializes events currently stored on Tohu instance
   */
  serialize() {
    return JSON.stringify(output[settings.format](this.events));
  }

  /**
   * Stores currently present event to a file
   * 
   * @param {String} [file] - allows to override filename
   */
  toFile(file) {
    file = file || path.join(utils.getStartDir(), settings.file);

    return new Promise((res, rej) => {
      fs.writeFile(
        file,
        this.serialize(),
        err => err ? rej(err) : res
      );
    });
  }

}

module.exports = Tohu;