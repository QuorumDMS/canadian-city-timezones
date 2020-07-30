const path = require('path');
const {createReadStream} = require('fs');
const {createInterface} = require('readline');

const CITY_MAP_DATA =  path.join(__dirname, 'data.csv');

const HEADERS = [
  'name',
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

void async function () {
  for await (const data of getDataIterator()) {
    console.log(data);
  }
}()

const isPartialMatchFactory = (query) => {
  const searchItems = query.split(' ').map((item) => removeSpecialCharacters(item));

  return (data) => {
    const values = [
      data.name,
      data.province
    ];

    return searchItems.every((item) => values.join().includes(item));
  }
}

async function find(query) {
  const isPartialMatch = isPartialMatchFactory(query);

  for await (const data of getDataIterator()) {
    if (isPartialMatch(data)) {
      return data;
    }
  }
  return null;
}

async function findAll(query) {
  const isPartialMatch = isPartialMatchFactory(query);

  const results = [];
  for await (const data of getDataIterator()) {
    if (isPartialMatch(data)) {
      results.push(data);
    }
  }
  return results;
}

module.exports = {
  find,
  findAll
};
