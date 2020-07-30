# Canadian City Timezones

<img height="500px" src="https://user-images.githubusercontent.com/15315657/88974322-ac2f2980-d275-11ea-937a-924e67ccf138.png" />

Searchable timezones for all Canadian cities, towns, townships, villages, hamlets, and municipalities.

## Usage

`npm install canadian-city-timezones`

```ts
import {find, findAll} from 'canadian-city-timezones';

const {timezone} = await find('Lethbridge Alberta');
timezone // America/Edmonton
```

## API

### Methods

```ts
find(query: string): Promise<TimezoneResult>
```

Returns the first matching result for the given string.

```ts
findAll(query: string): Promise<TimezoneResult[]>
```

Returns all matching results for the given string.

### Interfaces

`TimezoneResult`
```
{
  name: string,
  province: string,
  timezone: string
}
```

## Development

Timezones are generated automatically by pulling the list of areas from `gc.ca` and feeding them into `geocode.xyz`.

To trigger generation, create a commit containing `[data]` in the message.
