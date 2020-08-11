#!/usr/bin/env node

// REMOVE ME

const { createWriteStream, mkdir, createReadStream } = require('fs');
const { dirname } = require('path');
const { pipeline, Readable, Transform } = require('stream');
const { promisify } = require('util');
const fetch = require('node-fetch');
const geoTz = require('geo-tz');
const removeAccents = require('remove-accents');
const Pick = require('stream-json/filters/Pick');
const {streamValues} = require('stream-json/streamers/StreamValues');

const mkdirAsync = promisify(mkdir);
const pipelineAsync = promisify(pipeline);

require('dotenv').config();

const STATS_CAN_URL = 'https://www12.statcan.gc.ca/rest/census-recensement/';
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
  const url = new URL('CR2016Geo.json', STATS_CAN_URL);
  url.searchParams.append('lang', 'E');
  url.searchParams.append('geos', 'CSD');
  url.searchParams.append('cpt', '00');

  const gcDataFileName = 'gc.json';

  // Download Stats Canada json data
  // We aren't piping this as the buffer seems to end prematurely when we do.
  // So let's just download it and then read from the downloaded file.
  const req = await fetch(url.href);
  await pipelineAsync(
    req.body,
    new Transform({
      transform: (() => {
        let truncateCount = 0;
        return (buffer, _, cb) => {
          // Response starts with // that must be stripped to be considered valid json
          if (truncateCount < 2) {
            let sliceCount = Math.min(2 - truncateCount, buffer.length);
            truncateCount += sliceCount;

            buffer = buffer.slice(sliceCount);
          }
          cb(null, buffer);
        }
      })()
    }),
    createWriteStream(gcDataFileName)
  );

  // Find all values
  const valuePipeline = createReadStream(gcDataFileName)
    .pipe(Pick.withParser({filter: /^(?:COLUMNS|DATA\.\d+)\b/}))
    .pipe(streamValues())
    .pipe(new Transform({
      objectMode: true,
      transform: (() => {
        let keys = [];
        return (data, _, cb) => {
          // Columns are first
          if (data.key === 0) {
            keys = data.value;
            return cb();
          }

          // Next are values
          const row = keys.reduce((obj, key, i) => {
            obj[key] = data.value[i];
            return obj;
          }, {});
          cb(null, row);
        }
      })()
    }));

  for await (const row of valuePipeline) {
    if (!VALID_CSD_TYPES.includes(row.GEO_TYPE)) {
      continue;
    }

    const name = removeAccents(row.GEO_NAME_NOM);
    const province = removeAccents(row.PROV_TERR_NAME_NOM);

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
