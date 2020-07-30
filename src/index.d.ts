declare interface TimezoneResult {
  name: string,
  province: string,
  timezone: string
}

declare function find(query: string): Promise<TimezoneResult>;

declare function findAll(query: string): Promise<TimezoneResult[]>;
