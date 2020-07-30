#!/usr/bin/env node

const { createWriteStream } = require('fs');
const { pipeline, Readable, Transform } = require('stream');
const { promisify } = require('util');
const fetch = require('node-fetch');
const csv = require('csv-parser');
const {removeSpecialCharacters} = require('./util');

const pipelineAsync = promisify(pipeline);

require('dotenv').config();

const CAN_CITY_LIST = 'https://www12.statcan.gc.ca/census-recensement/2016/dp-pd/hlt-fst/pd-pl/Tables/CompFile.cfm?Lang=Eng&T=301&OFT=FULLCSV';
const LOCATION_API_URL = 'https://us1.locationiq.com/v1/';

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

    const name = row['Geographic name, english'];
    const province = row['Province / territory, english'];

    yield {
      name,
      province
    };
  }
}

async function fetchLocationIQ(url, count = 0) {
  const req = await fetch(url);
  if (req.status === 404) return null;
  else if (req.status === 429) {
    await sleep(Math.max(count * 60, 1) * 1000);
    return fetchLocationIQ(url, count + 1);
  }

  if (!req.ok) {
    throw new Error(`Not ok: ${req.status}`);
  }

  return req.json();
}

async function getLocationData(value) {
  const url = new URL('search.php', LOCATION_API_URL);
  url.searchParams.append('key', process.env.LOCATION_API_KEY);
  url.searchParams.append('format', 'json');
  url.searchParams.append('q', value);
  url.searchParams.append('addressdetails', '1');
  url.searchParams.append('normalizeaddress', '1');
  url.searchParams.append('normalizecity', '1');
  url.searchParams.append('countrycodes', 'ca');

  const json = await fetchLocationIQ(url.href);
  if (!json) return null;

  const locations = json.filter((item) => item.address.city && item.address.state);
  return locations[0];
}

async function getTimezoneData({lat, lon} = {}) {
  const url = new URL('timezone.php', LOCATION_API_URL);
  url.searchParams.append('key', process.env.LOCATION_API_KEY);
  url.searchParams.append('lat', lat);
  url.searchParams.append('lon', lon);

  const json = await fetchLocationIQ(url.href);
  if (!json) return null;

  return json.timezone;
}

async function * generateData() {
  for await (const cityData of getCityData()) {
    const value = [cityData.name, cityData.province].join(', ');

    const location = await getLocationData(value);
    if (!location) continue;

    const timezone = await getTimezoneData(location);

    yield [
      removeSpecialCharacters(location.address.city),
      removeSpecialCharacters(location.address.state),
      timezone.name,
      timezone.short_name
    ].join(',');

    await sleep(1000);
  }
}

async function writeData(file, iterator) {
  await pipelineAsync(
    Readable.from(iterator),
    new Transform({
      objectMode: true,
      transform: (value, _, callback) => {
        console.log(value);
        callback(null, value + '\n');
      }
    }),
    createWriteStream(file)
  );
}

void async function () {
  try {
    await writeData(`${__dirname}/data.csv`, generateData());
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}();
