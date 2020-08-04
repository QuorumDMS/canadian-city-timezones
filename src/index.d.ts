declare module 'canadian-city-timezones';

declare interface TimezoneResult {
  city: string;
  province: string;
  timezone: string;
}

declare type Predicate = (data: TimezoneResult) => boolean;

declare function values(): AsyncGenerator<TimezoneResult>;

declare function find(predicate: Predicate): Promise<TimezoneResult | null>;

declare function filter(predicate: Predicate): AsyncGenerator<TimezoneResult>;
