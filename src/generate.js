#!/usr/bin/env node

const { createWriteStream, mkdir, createReadStream } = require('fs');
const { dirname } = require('path');
const { pipeline, Readable, Transform } = require('stream');
const { promisify } = require('util');
const fetch = require('node-fetch');
const csv = require('csv-parser');
const geoTz = require('geo-tz');
const removeAccents = require('remove-accents');

const mkdirAsync = promisify(mkdir);
const pipelineAsync = promisify(pipeline);

require('dotenv').config();

const CAN_CITY_LIST = 'https://www12.statcan.gc.ca/census-recensement/2016/dp-pd/hlt-fst/pd-pl/Tables/CompFile.cfm?Lang=Eng&T=301&OFT=FULLCSV';
const MAP_BOX_API_URL = 'https://api.mapbox.com/';

const VALID_CSD_TYPES = [
  'City',
  'Hamlet',
  'Municipality',
  'Town',
  'Township',
  'Village'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function * getCityData() {
  const req = await fetch(CAN_CITY_LIST);
  // Download file first as the csv parser would prematurely end being piped in directly
  await pipelineAsync(
    req.body,
    createWriteStream('gc.csv')
  );

  for await (const row of createReadStream('gc.csv').pipe(csv())) {
    const csdType = row['CSD type, english'];
    if (!VALID_CSD_TYPES.includes(csdType)) {
      continue;
    }

    const name = removeAccents(row['Geographic name, english']);
    const province = removeAccents(row['Province / territory, english']);

    yield {
      name,
      province
    };
  }
}

async function getLocationData(value) {
  const url = new URL(`geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json`, MAP_BOX_API_URL);
  url.searchParams.append('access_token', process.env.MAP_BOX_API_KEY);
  url.searchParams.append('types', 'place');
  url.searchParams.append('country', 'CA');
  url.searchParams.append('autocomplete', 'false');

  const req = await fetch(url.href);

  const json = await req.json();

  if (!json || !json.features || !json.features.length) return null;

  return {
    name: json.features[0].place_name,
    lon: json.features[0].center[0],
    lat: json.features[0].center[1]
  };
}

async function * generateData() {
  for await (const cityData of getCityData()) {
    const value = [cityData.name, cityData.province].join(', ');

    const location = await getLocationData(value);
    if (!location) {
      console.log(`[!] No location found for: ${value}`);
      continue;
    }

    const [timezone] = geoTz(location.lat, location.lon) || [];
    if (!location) {
      console.log(`[!] No timezone found for: ${value} (${location.lat}, ${location.lon})`);
      continue;
    }

    yield [
      cityData.name,
      cityData.province,
      timezone
    ].join(',');

    await sleep(100);
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
    const file = process.argv[2];
    if (!file) {
      throw new Error('Missing output file');
    }

    await mkdirAsync(dirname(file), {recursive: true}).catch(() => void 0);
    await writeData(file, generateData());
  } catch (err) {
    console.error('[x]', err);
    process.exit(1);
  }
}();
