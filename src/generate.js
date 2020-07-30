#!/usr/bin/env node

const { URLSearchParams } = require('url');
const { createWriteStream } = require('fs');
const { pipeline, Readable, Transform } = require('stream');
const { promisify } = require('util');
const fetch = require('node-fetch');
const csv = require('csv-parser');
const {removeSpecialCharacters} = require('./util');
const { exit } = require('process');

const pipelineAsync = promisify(pipeline);

require('dotenv').config();

const CAN_CITY_LIST = 'https://www12.statcan.gc.ca/census-recensement/2016/dp-pd/hlt-fst/pd-pl/Tables/CompFile.cfm?Lang=Eng&T=301&OFT=FULLCSV';
const GEOCODE_API_URL = 'https://geocode.xyz';

const VALID_CSD_TYPES = [
  'City',
  'Hamlet',
  'Municipality',
  'Town',
  'Township and royalty',
  'Village'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function * getCityData() {
  const req = await fetch(CAN_CITY_LIST);
  for await (const row of req.body.pipe(csv())) {
    const csdType =row['CSD type, english'];
    if (!VALID_CSD_TYPES.includes(csdType)) continue;

    yield {
      name: row['Geographic name, english'],
      province: row['Province / territory, english']
    };
  }
}

async function getGeocodeData(value) {
  const params = new URLSearchParams();
  params.append('locate', value);
  params.append('region', 'CA');
  params.append('json', '1');
  params.append('moreinfo', '1');

  const req = await fetch(GEOCODE_API_URL, {
    method: 'post',
    body: params
  });
  const json = await req.json();

  if (!req.ok) {
    const [, limit] = /up to (\d*\.*\d+) per sec/.exec(json.error.message) || [, 1];
    const throttle = (1 / Number(limit)) * 1000;

    await sleep(throttle);
    return await getGeocodeData(value);
  }

  return json;
}

async function * generateData() {
  for await (const cityData of getCityData()) {
    const value = [cityData.name, cityData.province].join(', ');
    console.log(value);

    const geocode = await getGeocodeData(value);

    yield [
      removeSpecialCharacters(cityData.name),
      removeSpecialCharacters(cityData.province),
      geocode.timezone
    ].join('\t');

    await sleep(1000);
  }
}

async function writeData(file, iterator) {
  await pipelineAsync(
    Readable.from(iterator),
    new Transform({
      objectMode: true,
      transform: (item, _, callback) => callback(null, item + '\n')
    }),
    createWriteStream(file)
  );
}

void async function () {
  try {
    await writeData(`${__dirname}/data.csv`, generateData());
  } catch (err) {
    console.error(err);
    exit(1);
  }
}();
