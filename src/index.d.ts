declare interface TimezoneResult {
  city: string;
  province: string;
  timezone: string;
  timezoneName: string;
}

declare function find(query: string): Promise<TimezoneResult>;

declare function findAll(query: string): Promise<TimezoneResult[]>;
