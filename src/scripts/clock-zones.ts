export type ZoneOption = {
  key: string;
  label: string;
  timeZone: string;
  clockTimezoneId: string;
  clockTimeId: string;
  clockDateId: string;
  locationId: string;
};

export const ZONE_OPTIONS: ZoneOption[] = [
  {
    key: 'utc',
    label: 'UTC',
    timeZone: 'UTC',
    clockTimezoneId: 'utc-timezone',
    clockTimeId: 'utc-time',
    clockDateId: 'utc-date',
    locationId: 'utc-location',
  },
  {
    key: 'helsinki',
    label: 'Helsinki, Finland',
    timeZone: 'Europe/Helsinki',
    clockTimezoneId: 'helsinki-timezone',
    clockTimeId: 'helsinki-time',
    clockDateId: 'helsinki-date',
    locationId: 'helsinki-location',
  },
  {
    key: 'manila',
    label: 'Manila, Philippines',
    timeZone: 'Asia/Manila',
    clockTimezoneId: 'manila-timezone',
    clockTimeId: 'manila-time',
    clockDateId: 'manila-date',
    locationId: 'manila-location',
  },
  {
    key: 'san-francisco',
    label: 'San Francisco, USA',
    timeZone: 'America/Los_Angeles',
    clockTimezoneId: 'sf-timezone',
    clockTimeId: 'san-francisco-time',
    clockDateId: 'san-francisco-date',
    locationId: 'sf-location',
  },
  {
    key: 'beijing',
    label: 'Beijing, China',
    timeZone: 'Asia/Shanghai',
    clockTimezoneId: 'beijing-timezone',
    clockTimeId: 'beijing-time',
    clockDateId: 'beijing-date',
    locationId: 'beijing-location',
  },
  {
    key: 'netherlands',
    label: 'The Hague, Netherlands',
    timeZone: 'Europe/Amsterdam',
    clockTimezoneId: 'netherlands-timezone',
    clockTimeId: 'netherlands-time',
    clockDateId: 'netherlands-date',
    locationId: 'netherlands-location',
  },
  {
    key: 'sydney',
    label: 'Sydney, Australia',
    timeZone: 'Australia/Sydney',
    clockTimezoneId: 'sydney-timezone',
    clockTimeId: 'sydney-time',
    clockDateId: 'sydney-date',
    locationId: 'sydney-location',
  },
  {
    key: 'tokyo',
    label: 'Tokyo, Japan',
    timeZone: 'Asia/Tokyo',
    clockTimezoneId: 'tokyo-timezone',
    clockTimeId: 'tokyo-time',
    clockDateId: 'tokyo-date',
    locationId: 'tokyo-location',
  },
];

export const CONVERTER_STORAGE_KEY = 'clock-converter-state';
export const DEFAULT_SOURCE_TIMEZONE = 'UTC';
export const DEFAULT_TARGET_TIMEZONE = 'Europe/Helsinki';
