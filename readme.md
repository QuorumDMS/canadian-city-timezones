<h1 align="center">Canadian City Timezones</h1>

<p align="center">
  <img height="500px" src="https://user-images.githubusercontent.com/15315657/88974322-ac2f2980-d275-11ea-937a-924e67ccf138.png" />
</p>

<p align="center">Searchable timezones for all Canadian cities, towns, townships, villages, hamlets, and municipalities.</p>

## Usage

`npm install canadian-city-timezones`

```ts
import {find} from 'canadian-city-timezones';

const result = await find((city, province) => city === 'Lethbridge' && province === 'Alberta');
result.city // Lethbridge
result.province // Alberta
result.timezone // America/Edmonton
```

## API

### Methods

```ts
find(predicate: (value: TimezoneResult) => boolean): Promise<TimezoneResult | null>
```

Returns the first matching result for the given predicate.

```ts
filter(predicate: (value: TimezoneResult) => boolean): AsyncGenerator<TimezoneResult>
```

Yields all matching results for the given predicate.

```ts
values(): AsyncGenerator<TimezoneResult>
```

Yields all values.

### Interfaces

`TimezoneResult`
```
{
  city: string;
  province: string;
  timezone: string;
}
```

## Development

Timezones are generated automatically by pulling the list of areas from `gc.ca` and feeding them into `mapbox.com` to get their coordinates, then getting the timezone using [`geo-tz`](https://github.com/evansiroky/node-geo-tz).
