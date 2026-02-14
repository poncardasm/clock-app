import { ZONE_OPTIONS } from './clock-zones';

export type TimeZoneOption = {
  timeZone: string;
  label: string;
  labelLower: string;
  timeZoneLower: string;
};

const CONTINENT_REGIONS = new Set([
  'Africa',
  'America',
  'Antarctica',
  'Asia',
  'Atlantic',
  'Australia',
  'Europe',
  'Indian',
  'Pacific',
]);

const TIMEZONE_COUNTRY_OVERRIDES: Record<string, string> = {
  'Europe/Helsinki': 'Finland',
  'Asia/Manila': 'Philippines',
  'America/Los_Angeles': 'USA',
  'Asia/Shanghai': 'China',
  'Europe/Amsterdam': 'Netherlands',
  'Australia/Sydney': 'Australia',
  'Asia/Tokyo': 'Japan',
};

const CITY_COUNTRY_FALLBACK: Record<string, string> = {
  helsinki: 'Finland',
  manila: 'Philippines',
  'los angeles': 'USA',
  shanghai: 'China',
  amsterdam: 'Netherlands',
  sydney: 'Australia',
  tokyo: 'Japan',
  london: 'United Kingdom',
  paris: 'France',
  berlin: 'Germany',
  madrid: 'Spain',
  rome: 'Italy',
  lisbon: 'Portugal',
  stockholm: 'Sweden',
  oslo: 'Norway',
  copenhagen: 'Denmark',
  warsaw: 'Poland',
  prague: 'Czech Republic',
  vienna: 'Austria',
  athens: 'Greece',
  dublin: 'Ireland',
  brussels: 'Belgium',
  zurich: 'Switzerland',
  budapest: 'Hungary',
  bucharest: 'Romania',
  sofia: 'Bulgaria',
  zagreb: 'Croatia',
  vilnius: 'Lithuania',
  riga: 'Latvia',
  tallinn: 'Estonia',
  kyiv: 'Ukraine',
  moscow: 'Russia',
  istanbul: 'Turkey',
  dubai: 'United Arab Emirates',
  doha: 'Qatar',
  riyadh: 'Saudi Arabia',
  tehran: 'Iran',
  baghdad: 'Iraq',
  jerusalem: 'Israel',
  cairo: 'Egypt',
  nairobi: 'Kenya',
  lagos: 'Nigeria',
  'addis ababa': 'Ethiopia',
  casablanca: 'Morocco',
  johannesburg: 'South Africa',
  beijing: 'China',
  seoul: 'South Korea',
  bangkok: 'Thailand',
  'ho chi minh': 'Vietnam',
  jakarta: 'Indonesia',
  singapore: 'Singapore',
  'kuala lumpur': 'Malaysia',
  delhi: 'India',
  kolkata: 'India',
  mumbai: 'India',
  karachi: 'Pakistan',
  dhaka: 'Bangladesh',
  kathmandu: 'Nepal',
  colombo: 'Sri Lanka',
  perth: 'Australia',
  melbourne: 'Australia',
  brisbane: 'Australia',
  adelaide: 'Australia',
  auckland: 'New Zealand',
  wellington: 'New Zealand',
  honolulu: 'USA',
  anchorage: 'USA',
  chicago: 'USA',
  denver: 'USA',
  'new york': 'USA',
  toronto: 'Canada',
  vancouver: 'Canada',
  montreal: 'Canada',
  mexico: 'Mexico',
  bogota: 'Colombia',
  lima: 'Peru',
  quito: 'Ecuador',
  'sao paulo': 'Brazil',
  'rio de janeiro': 'Brazil',
  santiago: 'Chile',
  caracas: 'Venezuela',
  'buenos aires': 'Argentina',
  montevideo: 'Uruguay',
};

let cachedTimeZoneOptions: TimeZoneOption[] = [];

function humanizeTimeZonePart(part: string): string {
  return part.replace(/_/g, ' ');
}

function formatTimeZoneLabel(timeZone: string): string {
  if (timeZone === 'UTC') {
    return 'UTC';
  }

  const parts = timeZone.split('/').map(humanizeTimeZonePart);
  const city = parts[parts.length - 1] ?? timeZone;
  const cityKey = city.toLowerCase();
  const overrideCountry =
    TIMEZONE_COUNTRY_OVERRIDES[timeZone] ?? CITY_COUNTRY_FALLBACK[cityKey];

  if (overrideCountry) {
    return `${city}, ${overrideCountry}`;
  }

  const countryOrRegion = parts.length > 1 ? parts[parts.length - 2] : city;
  if (parts.length === 2 && CONTINENT_REGIONS.has(parts[0])) {
    return city;
  }

  if (city === countryOrRegion) {
    return city;
  }

  return `${city}, ${countryOrRegion}`;
}

function buildTimeZoneOption(timeZone: string): TimeZoneOption {
  const label = formatTimeZoneLabel(timeZone);
  return {
    timeZone,
    label,
    labelLower: label.toLowerCase(),
    timeZoneLower: timeZone.toLowerCase(),
  };
}

export function getTimeZoneOptions(): TimeZoneOption[] {
  if (cachedTimeZoneOptions.length > 0) {
    return cachedTimeZoneOptions;
  }

  const supported =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : ZONE_OPTIONS.map((zone) => zone.timeZone);

  const all = new Set(supported);
  all.add('UTC');

  cachedTimeZoneOptions = Array.from(all)
    .map(buildTimeZoneOption)
    .sort((a, b) => a.label.localeCompare(b.label));

  return cachedTimeZoneOptions;
}

export function findTimeZoneOptionByTimeZone(
  timeZone: string,
): TimeZoneOption | undefined {
  return getTimeZoneOptions().find((option) => option.timeZone === timeZone);
}

export function isSupportedTimeZone(timeZone: string): boolean {
  return findTimeZoneOptionByTimeZone(timeZone) !== undefined;
}

export function filterTimeZoneOptions(
  query: string,
  limit: number,
): TimeZoneOption[] {
  const options = getTimeZoneOptions();
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return options.slice(0, limit);
  }

  return options
    .filter(
      (option) =>
        option.labelLower.includes(needle) || option.timeZoneLower.includes(needle),
    )
    .slice(0, limit);
}

export function findTimeZoneOptionByInput(value: string): TimeZoneOption | null {
  const needle = value.trim().toLowerCase();
  if (!needle) {
    return null;
  }

  const options = getTimeZoneOptions();

  const exact = options.find(
    (option) => option.labelLower === needle || option.timeZoneLower === needle,
  );
  if (exact) {
    return exact;
  }

  const prefixMatches = options.filter(
    (option) =>
      option.labelLower.startsWith(needle) || option.timeZoneLower.startsWith(needle),
  );

  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

export function formatZoneInputValue(timeZone: string): string {
  return findTimeZoneOptionByTimeZone(timeZone)?.label ?? timeZone;
}
