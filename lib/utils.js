'use strict';

const path = require('path');
const idSource = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

module.exports = {
  anyOf,
  rand,
  generateId,
  getRequestUrl,
  getStartDir
};

/**
 * @typedef {String} IdString
 * Sting consisting of characters from ID source
 */

/**
 * Returns alphanumeric string of given length
 * consisting of characters from outlying source string
 *
 * @param {Number} length
 * @returns {IdString}
 */
function generateId(length) {
  return new Array(length).fill(0).map(() => anyOf(idSource)).join('');
}

/**
 * Returns random element from given collection
 * @param {Array|String} collection
 * @returns {*}
 */
function anyOf(collection) {
  return collection[Math.floor(rand(collection.length))];
}

/**
 * Produces random number within given bounds
 *
 * @param {Number} bottom
 * @param {Number} [top] - when missing, range is from 0 to bottom
 * @returns {*}
 */
function rand(bottom, top) {
  if (!top) {
    [bottom, top] = [0, bottom];
  }

  return bottom + Math.random() * (top - bottom);
}

/**
 * For given request options,
 * tries to retrieve the url
 *
 * @param {Object} opts
 * @return {String}
 */
function getRequestUrl(opts) {
  let uri = opts.uri || opts;
  return uri.href ? uri.href : [uri.protocol || 'http:', '//', uri.host, ':', uri.port, uri.path].join('');
}

/**
 * Returns a directory which contains a script started execution
 */
function getStartDir() {
  return path.parse(require.main.filename).dir;
}