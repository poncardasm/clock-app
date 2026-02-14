type ZoneOption = {
  key: string;
  label: string;
  timeZone: string;
  clockTimezoneId: string;
  clockTimeId: string;
  clockDateId: string;
  locationId: string;
};

type DstStatus = 'normal' | 'ambiguous' | 'invalid-adjusted';

type ConverterInput = {
  date: string;
  time: string;
  sourceTimeZone: string;
  targetTimeZone: string;
};

type ConversionResult = {
  instant: Date;
  status: DstStatus;
  adjustedWall?: WallTime;
};

type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type ZonedDateTimeParts = WallTime & {
  second: number;
};

type ConverterElements = {
  form: HTMLFormElement;
  dateInput: HTMLInputElement;
  timeInput: HTMLInputElement;
  sourceSelect: HTMLSelectElement;
  targetSelect: HTMLSelectElement;
  swapButton: HTMLButtonElement;
  result: HTMLElement;
  sourceLabel: HTMLElement;
  sourceZoneName: HTMLElement;
  sourceTime: HTMLElement;
  sourcePeriod: HTMLElement;
  sourceDate: HTMLElement;
  targetLabel: HTMLElement;
  targetZoneName: HTMLElement;
  targetTime: HTMLElement;
  targetPeriod: HTMLElement;
  targetDate: HTMLElement;
  relative: HTMLElement;
  error: HTMLElement;
  hint: HTMLElement;
};

const ZONE_OPTIONS: ZoneOption[] = [
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

const CONVERTER_STORAGE_KEY = 'clock-converter-state';
const DEFAULT_SOURCE_TIMEZONE = 'UTC';
const DEFAULT_TARGET_TIMEZONE = 'Europe/Helsinki';

// Time format state
let is24Hour = true;
let converterElements: ConverterElements | null = null;
let lastConvertedTargetWall: { date: string; time: string } | null = null;

// Format options for clock time display
function getClockTimeOptions(): Intl.DateTimeFormatOptions {
  return {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !is24Hour,
  };
}

// Format options for converted time display
function getConverterTimeOptions(): Intl.DateTimeFormatOptions {
  return {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !is24Hour,
  };
}

// Format options for date display
const dateOptions: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

// Function to determine if it's day or night
function isDaytime(hour: number): boolean {
  return hour >= 6 && hour < 18;
}

function findZoneByTimeZone(timeZone: string): ZoneOption | undefined {
  return ZONE_OPTIONS.find((zone) => zone.timeZone === timeZone);
}

function isSupportedTimeZone(timeZone: string): boolean {
  return findZoneByTimeZone(timeZone) !== undefined;
}

const zonedPartsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getZonedPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = zonedPartsFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  zonedPartsFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getZonedDateTimeParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const parts = getZonedPartsFormatter(timeZone).formatToParts(date);
  const mapped: Record<string, string> = {};

  parts.forEach((part) => {
    if (part.type !== 'literal') {
      mapped[part.type] = part.value;
    }
  });

  return {
    year: Number(mapped.year),
    month: Number(mapped.month),
    day: Number(mapped.day),
    hour: Number(mapped.hour),
    minute: Number(mapped.minute),
    second: Number(mapped.second),
  };
}

function wallToMinuteEpoch(wall: WallTime): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, 0, 0);
}

function partsToWall(parts: ZonedDateTimeParts): WallTime {
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

function isSameWallMinute(a: WallTime, b: WallTime): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute
  );
}

function parseWallTime(dateValue: string, timeValue: string): WallTime | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, hour, minute };
}

function formatDateInputValue(wall: WallTime): string {
  return `${wall.year}-${pad2(wall.month)}-${pad2(wall.day)}`;
}

function formatTimeInputValue(wall: WallTime): string {
  return `${pad2(wall.hour)}:${pad2(wall.minute)}`;
}

function formatWallForHint(wall: WallTime): string {
  return `${formatDateInputValue(wall)} ${formatTimeInputValue(wall)}`;
}

function getTimeZoneNameAtInstant(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
}

function getUtcOffsetLabelAtInstant(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const offsetPart = parts.find((part) => part.type === 'timeZoneName')?.value;

  if (!offsetPart) {
    return 'UTC';
  }

  if (offsetPart === 'GMT') {
    return 'UTC+0';
  }

  return offsetPart.replace('GMT', 'UTC');
}

function formatConvertedDateTime(instant: Date, timeZone: string): string {
  const datePart = instant.toLocaleDateString('en-GB', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timePart = instant
    .toLocaleTimeString('en-US', {
      timeZone,
      ...getConverterTimeOptions(),
    })
    .replace(/am|pm/i, (match) => match.toUpperCase());
  return `${datePart} at ${timePart}`;
}
function formatConverterClockTime(instant: Date, timeZone: string): { time: string; period: string } {
  const formatted = instant
    .toLocaleTimeString('en-US', {
      timeZone,
      ...getConverterTimeOptions(),
    })
    .replace(/am|pm/i, (match) => match.toUpperCase())
    .trim();

  if (is24Hour) {
    return { time: formatted, period: '' };
  }

  const match = /^(\d{1,2}:\d{2})\s?([AP]M)$/.exec(formatted);
  if (!match) {
    return { time: formatted, period: '' };
  }

  return {
    time: match[1],
    period: match[2],
  };
}

function formatConverterDate(instant: Date, timeZone: string): string {
  return instant.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatHourMinuteDifference(diffMinutes: number): string {
  const absoluteMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `${hours}:${pad2(minutes)} hours`;
}

function describeRelativeTime(sourceLabel: string, targetLabel: string, diffMinutes: number): string {
  if (diffMinutes === 0) {
    return `${targetLabel} and ${sourceLabel} currently share the same local time.`;
  }

  const diffText = formatHourMinuteDifference(diffMinutes);
  if (diffMinutes > 0) {
    return `${targetLabel} time is ${diffText} ahead of ${sourceLabel}.`;
  }

  return `${targetLabel} time is ${diffText} behind ${sourceLabel}.`;
}

function resolveSourceInstant(timeZone: string, requestedWall: WallTime): ConversionResult {
  const requestedEpoch = wallToMinuteEpoch(requestedWall);
  const baseUtc = requestedEpoch;
  const searchWindowMinutes = 36 * 60;

  const exactMatches: number[] = [];
  let nextAfter: { instantMs: number; wallEpoch: number; wall: WallTime } | null = null;
  let nearest: { instantMs: number; wallDiff: number; wall: WallTime } | null = null;

  for (let delta = -searchWindowMinutes; delta <= searchWindowMinutes; delta += 1) {
    const candidateMs = baseUtc + delta * 60_000;
    const candidateWall = partsToWall(getZonedDateTimeParts(new Date(candidateMs), timeZone));
    const candidateWallEpoch = wallToMinuteEpoch(candidateWall);

    if (isSameWallMinute(candidateWall, requestedWall)) {
      exactMatches.push(candidateMs);
    }

    if (candidateWallEpoch > requestedEpoch) {
      if (
        !nextAfter ||
        candidateWallEpoch < nextAfter.wallEpoch ||
        (candidateWallEpoch === nextAfter.wallEpoch && candidateMs < nextAfter.instantMs)
      ) {
        nextAfter = {
          instantMs: candidateMs,
          wallEpoch: candidateWallEpoch,
          wall: candidateWall,
        };
      }
    }

    const wallDiff = Math.abs(candidateWallEpoch - requestedEpoch);
    if (!nearest || wallDiff < nearest.wallDiff || (wallDiff === nearest.wallDiff && candidateMs < nearest.instantMs)) {
      nearest = {
        instantMs: candidateMs,
        wallDiff,
        wall: candidateWall,
      };
    }
  }

  if (exactMatches.length === 1) {
    return {
      instant: new Date(exactMatches[0]),
      status: 'normal',
    };
  }

  if (exactMatches.length > 1) {
    return {
      instant: new Date(Math.min(...exactMatches)),
      status: 'ambiguous',
    };
  }

  if (nextAfter) {
    return {
      instant: new Date(nextAfter.instantMs),
      status: 'invalid-adjusted',
      adjustedWall: nextAfter.wall,
    };
  }

  if (nearest) {
    return {
      instant: new Date(nearest.instantMs),
      status: 'invalid-adjusted',
      adjustedWall: nearest.wall,
    };
  }

  return {
    instant: new Date(baseUtc),
    status: 'invalid-adjusted',
  };
}

function getConverterElements(): ConverterElements | null {
  const form = document.getElementById('converter-form') as HTMLFormElement | null;
  const dateInput = document.getElementById('converter-date') as HTMLInputElement | null;
  const timeInput = document.getElementById('converter-time') as HTMLInputElement | null;
  const sourceSelect = document.getElementById('converter-source-zone') as HTMLSelectElement | null;
  const targetSelect = document.getElementById('converter-target-zone') as HTMLSelectElement | null;
  const swapButton = document.getElementById('converter-swap') as HTMLButtonElement | null;
  const result = document.getElementById('converter-result');
  const sourceLabel = document.getElementById('converter-source-label');
  const sourceZoneName = document.getElementById('converter-source-zone-name');
  const sourceTime = document.getElementById('converter-source-time');
  const sourcePeriod = document.getElementById('converter-source-period');
  const sourceDate = document.getElementById('converter-source-date');
  const targetLabel = document.getElementById('converter-target-label');
  const targetZoneName = document.getElementById('converter-target-zone-name');
  const targetTime = document.getElementById('converter-target-time');
  const targetPeriod = document.getElementById('converter-target-period');
  const targetDate = document.getElementById('converter-target-date');
  const relative = document.getElementById('converter-relative');
  const error = document.getElementById('converter-error');
  const hint = document.getElementById('converter-hint');

  if (
    !form ||
    !dateInput ||
    !timeInput ||
    !sourceSelect ||
    !targetSelect ||
    !swapButton ||
    !result ||
    !sourceLabel ||
    !sourceZoneName ||
    !sourceTime ||
    !sourcePeriod ||
    !sourceDate ||
    !targetLabel ||
    !targetZoneName ||
    !targetTime ||
    !targetPeriod ||
    !targetDate ||
    !relative ||
    !error ||
    !hint
  ) {
    return null;
  }

  return {
    form,
    dateInput,
    timeInput,
    sourceSelect,
    targetSelect,
    swapButton,
    result,
    sourceLabel,
    sourceZoneName,
    sourceTime,
    sourcePeriod,
    sourceDate,
    targetLabel,
    targetZoneName,
    targetTime,
    targetPeriod,
    targetDate,
    relative,
    error,
    hint,
  };
}

function populateZoneSelect(selectElement: HTMLSelectElement): void {
  selectElement.innerHTML = '';
  ZONE_OPTIONS.forEach((zone) => {
    const option = document.createElement('option');
    option.value = zone.timeZone;
    option.textContent = zone.label;
    selectElement.appendChild(option);
  });
}

function loadConverterState(): ConverterInput | null {
  const raw = localStorage.getItem(CONVERTER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ConverterInput;
    if (
      typeof parsed.date !== 'string' ||
      typeof parsed.time !== 'string' ||
      typeof parsed.sourceTimeZone !== 'string' ||
      typeof parsed.targetTimeZone !== 'string'
    ) {
      return null;
    }

    if (!isSupportedTimeZone(parsed.sourceTimeZone) || !isSupportedTimeZone(parsed.targetTimeZone)) {
      return null;
    }

    if (!parseWallTime(parsed.date, parsed.time)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveConverterState(input: ConverterInput): void {
  localStorage.setItem(CONVERTER_STORAGE_KEY, JSON.stringify(input));
}

function getDefaultConverterInput(): ConverterInput {
  const nowParts = getZonedDateTimeParts(new Date(), DEFAULT_SOURCE_TIMEZONE);
  return {
    date: formatDateInputValue(partsToWall(nowParts)),
    time: formatTimeInputValue(partsToWall(nowParts)),
    sourceTimeZone: DEFAULT_SOURCE_TIMEZONE,
    targetTimeZone: DEFAULT_TARGET_TIMEZONE,
  };
}

function readConverterInput(elements: ConverterElements): ConverterInput | null {
  const input: ConverterInput = {
    date: elements.dateInput.value.trim(),
    time: elements.timeInput.value.trim(),
    sourceTimeZone: elements.sourceSelect.value,
    targetTimeZone: elements.targetSelect.value,
  };

  if (
    !parseWallTime(input.date, input.time) ||
    !isSupportedTimeZone(input.sourceTimeZone) ||
    !isSupportedTimeZone(input.targetTimeZone)
  ) {
    return null;
  }

  return input;
}

function writeConverterInput(elements: ConverterElements, input: ConverterInput): void {
  elements.dateInput.value = input.date;
  elements.timeInput.value = input.time;
  elements.sourceSelect.value = input.sourceTimeZone;
  elements.targetSelect.value = input.targetTimeZone;
}

function buildDstHint(result: ConversionResult, sourceLabel: string): string {
  if (result.status === 'ambiguous') {
    return `The selected time in ${sourceLabel} occurs twice due to daylight saving time. Used the earlier occurrence.`;
  }

  if (result.status === 'invalid-adjusted') {
    if (result.adjustedWall) {
      return `The selected time in ${sourceLabel} does not exist due to daylight saving time. Used the next valid local time (${formatWallForHint(result.adjustedWall)}).`;
    }
    return `The selected time in ${sourceLabel} does not exist due to daylight saving time.`;
  }

  return '';
}

function clearConverterError(elements: ConverterElements): void {
  elements.error.textContent = '';
  elements.error.classList.add('hidden');
}

function showConverterError(elements: ConverterElements, message: string): void {
  elements.error.textContent = message;
  elements.error.classList.remove('hidden');
  elements.relative.textContent = '';
}

function performConversion(elements: ConverterElements, persistState: boolean): void {
  const input = readConverterInput(elements);
  if (!input) {
    showConverterError(elements, 'Enter a valid date, time, and supported time zones.');
    elements.hint.textContent = '';
    return;
  }

  const wall = parseWallTime(input.date, input.time);
  if (!wall) {
    showConverterError(elements, 'Enter a valid date and time.');
    elements.hint.textContent = '';
    return;
  }

  const sourceZone = findZoneByTimeZone(input.sourceTimeZone);
  const targetZone = findZoneByTimeZone(input.targetTimeZone);
  if (!sourceZone || !targetZone) {
    showConverterError(elements, 'Unable to resolve selected time zone.');
    elements.hint.textContent = '';
    return;
  }

  clearConverterError(elements);
  const result = resolveSourceInstant(input.sourceTimeZone, wall);
  const sourceTimeParts = formatConverterClockTime(result.instant, input.sourceTimeZone);
  const targetTimeParts = formatConverterClockTime(result.instant, input.targetTimeZone);
  const sourceDateLabel = formatConverterDate(result.instant, input.sourceTimeZone);
  const targetDateLabel = formatConverterDate(result.instant, input.targetTimeZone);
  const sourceTimeZoneName = getTimeZoneNameAtInstant(result.instant, input.sourceTimeZone);
  const targetTimeZoneName = getTimeZoneNameAtInstant(result.instant, input.targetTimeZone);
  const sourceWall = partsToWall(getZonedDateTimeParts(result.instant, input.sourceTimeZone));
  const targetWall = partsToWall(getZonedDateTimeParts(result.instant, input.targetTimeZone));
  const diffMinutes = (wallToMinuteEpoch(targetWall) - wallToMinuteEpoch(sourceWall)) / 60_000;

  elements.sourceLabel.textContent = sourceZone.label;
  elements.sourceZoneName.textContent = sourceTimeZoneName;
  elements.sourceTime.textContent = sourceTimeParts.time;
  elements.sourcePeriod.textContent = sourceTimeParts.period;
  elements.sourceDate.textContent = sourceDateLabel;
  elements.targetLabel.textContent = targetZone.label;
  elements.targetZoneName.textContent = targetTimeZoneName;
  elements.targetTime.textContent = targetTimeParts.time;
  elements.targetPeriod.textContent = targetTimeParts.period;
  elements.targetDate.textContent = targetDateLabel;
  elements.relative.textContent = describeRelativeTime(sourceZone.label, targetZone.label, diffMinutes);

  elements.hint.textContent = buildDstHint(result, sourceZone.label);

  lastConvertedTargetWall = {
    date: formatDateInputValue(targetWall),
    time: formatTimeInputValue(targetWall),
  };

  if (persistState) {
    saveConverterState(input);
  }
}

function swapConverterValues(elements: ConverterElements): void {
  const currentInput = readConverterInput(elements);
  if (!currentInput) {
    return;
  }

  elements.sourceSelect.value = currentInput.targetTimeZone;
  elements.targetSelect.value = currentInput.sourceTimeZone;

  if (lastConvertedTargetWall) {
    elements.dateInput.value = lastConvertedTargetWall.date;
    elements.timeInput.value = lastConvertedTargetWall.time;
  }

  performConversion(elements, true);
}

function initConverter(): void {
  const elements = getConverterElements();
  if (!elements) {
    return;
  }

  populateZoneSelect(elements.sourceSelect);
  populateZoneSelect(elements.targetSelect);

  const initial = loadConverterState() ?? getDefaultConverterInput();
  writeConverterInput(elements, initial);
  converterElements = elements;

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    performConversion(elements, true);
  });

  const runLiveConversion = (): void => {
    performConversion(elements, true);
  };

  elements.dateInput.addEventListener('input', runLiveConversion);
  elements.dateInput.addEventListener('change', runLiveConversion);
  elements.timeInput.addEventListener('input', runLiveConversion);
  elements.timeInput.addEventListener('change', runLiveConversion);
  elements.sourceSelect.addEventListener('change', runLiveConversion);
  elements.targetSelect.addEventListener('change', runLiveConversion);

  elements.swapButton.addEventListener('click', () => {
    swapConverterValues(elements);
  });

  performConversion(elements, false);
}

function refreshConverterForFormatChange(): void {
  if (!converterElements) {
    return;
  }

  performConversion(converterElements, false);
}

// Function to update a single clock
function updateClock(zone: ZoneOption, now: Date): void {
  const parts = getZonedDateTimeParts(now, zone.timeZone);

  let timeString = now.toLocaleTimeString('en-US', {
    timeZone: zone.timeZone,
    ...getClockTimeOptions(),
  });
  timeString = timeString.replace(/am|pm/i, (match) => match.toUpperCase());

  const timeElement = document.getElementById(zone.clockTimeId);
  if (timeElement) {
    timeElement.textContent = timeString;
  }

  const dateElement = document.getElementById(zone.clockDateId);
  if (dateElement) {
    dateElement.textContent = now.toLocaleDateString('en-GB', {
      timeZone: zone.timeZone,
      ...dateOptions,
    });
  }

  const locationElement = document.getElementById(zone.locationId);
  if (locationElement) {
    locationElement.setAttribute('data-daynight', isDaytime(parts.hour) ? '☀️' : '🌙');
  }

  const timezoneElement = document.getElementById(zone.clockTimezoneId);
  if (timezoneElement) {
    timezoneElement.textContent = getUtcOffsetLabelAtInstant(now, zone.timeZone);
  }
}

function updateClocks(): void {
  const now = new Date();
  ZONE_OPTIONS.forEach((zone) => updateClock(zone, now));
}

// Handle time format toggle
document.querySelectorAll('.time-format-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.time-format-btn').forEach((btn) => btn.removeAttribute('data-active'));
    (button as HTMLElement).setAttribute('data-active', '');

    const format = (button as HTMLElement).dataset.format;
    is24Hour = format === '24';

    updateClocks();
    refreshConverterForFormatChange();
  });
});

// Handle theme toggle
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

initConverter();
updateClocks();
setInterval(updateClocks, 1000);
