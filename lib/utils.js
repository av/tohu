'use strict';

const idSource = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

module.exports = {
  anyOf,
  rand,
  generateId
};

function generateId(length) {
  return Array(length).fill(0).map(() => anyOf(idSource)).join('');
}

function anyOf(arr) {
  return arr[Math.floor(rand(arr.length))];
}

function rand(bottom, top) {
  if (!top) {
    [bottom, top] = [0, bottom];
  }

  return bottom + Math.random() * (top - bottom);
}
