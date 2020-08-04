const path = require('path');
const {createReadStream} = require('fs');
const {createInterface} = require('readline');

const CITY_MAP_DATA =  path.join(__dirname, 'data.csv');

const HEADERS = [
  'city',
  'province',
  'timezone'
];

async function * getDataIterator() {
  const rl = createInterface({
    input: createReadStream(CITY_MAP_DATA, {encoding: 'utf-8'})
  });

  for await (const line of rl) {
    const values = line.split(',');

    let obj = {};
    for (let i in HEADERS) {
      obj[HEADERS[i]] = values[i]
    }

    yield obj;
  }
}

async function* values() {
  yield* getDataIterator();
}

async function find(predicate) {
  if (typeof predicate !== 'function') {
    throw new TypeError(`${String(predicate)} is not a function`);
  }

  for await (const data of getDataIterator()) {
    if (predicate(data)) {
      return data;
    }
  }
  return null;
}

async function* filter(predicate) {
  if (typeof predicate !== 'function') {
    throw new TypeError(`${String(predicate)} is not a function`);
  }

  for await (const data of getDataIterator()) {
    if (predicate(data)) {
      yield data;
    }
  }
}

module.exports = {
  values,
  find,
  filter
};
