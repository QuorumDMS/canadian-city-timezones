declare module 'canadian-city-timezones';

declare interface TimezoneResult {
  city: string;
  province: string;
  timezone: string;
}

declare function find(query: string): Promise<TimezoneResult>;

declare function findAll(query: string): Promise<TimezoneResult[]>;
