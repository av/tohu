'use strict';

// Require Tohu before any of target http 
// calls are about to be triggered
const tohu = require('../index');
const r2 = require('r2');

main();

async function main() {
  // Run the code performing http calls
  await Promise.all([
    doRequests().then(aBitMoreRequests),
    doMoreRequests().then(doRequests),
    aBitMoreRequests().then(doMoreRequests)
  ]);

  // When the code is done, save collected data.
  // output file will be at $PWD/simplest.json
  tohu.toFile('simplest.json');
}

async function doRequests() {
  await Promise.all([
    r2('https://www.booknomads.com/api/v0/isbn/9789000035526').json,
    r2('https://api.abalin.net/get/today').json,
  ]);
}

async function doMoreRequests() {
  await Promise.all([
    r2('http://thecatapi.com/api/images/get?format=xml&results_per_page=20').text,
    r2('https://api.jikan.moe/character/1/').json,
  ]);
}

async function aBitMoreRequests() {
  await Promise.all([
    r2('https://openlibrary.org/api/books?bibkeys=ISBN:0201558025&format=json').json
  ]);
}

