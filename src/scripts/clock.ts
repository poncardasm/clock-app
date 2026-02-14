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

type ConversionResult = {
  instant: Date;
  status: DstStatus;
  adjustedWall?: WallTime;
};

type ConverterState = {
  sourceTimeZone: string;
  targetTimeZone: string;
  date: string;
  time: string;
};

type ConverterElements = {
  swapButton: HTMLButtonElement;
  sourceSelect: HTMLSelectElement;
  sourceZoneName: HTMLElement;
  sourceTimeInput: HTMLInputElement;
  sourceDateDisplay: HTMLButtonElement;
  sourceDateInput: HTMLInputElement;
  targetSelect: HTMLSelectElement;
  targetZoneName: HTMLElement;
  targetTime: HTMLElement;
  targetPeriod: HTMLElement;
  targetDate: HTMLElement;
  relative: HTMLElement;
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

let is24Hour = true;
let converterElements: ConverterElements | null = null;
let converterState: ConverterState | null = null;

function getClockTimeOptions(): Intl.DateTimeFormatOptions {
  return {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !is24Hour,
  };
}

function getConverterTimeOptions(): Intl.DateTimeFormatOptions {
  return {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !is24Hour,
  };
}

const dateOptions: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

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

function formatWallDateLabel(wall: WallTime): string {
  const date = new Date(Date.UTC(wall.year, wall.month - 1, wall.day, 12));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
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

function getConverterElements(): ConverterElements | null {
  const swapButton = document.getElementById('converter-swap') as HTMLButtonElement | null;
  const sourceSelect = document.getElementById('converter-source-zone') as HTMLSelectElement | null;
  const sourceZoneName = document.getElementById('converter-source-zone-name');
  const sourceTimeInput = document.getElementById('converter-source-time-input') as HTMLInputElement | null;
  const sourceDateDisplay = document.getElementById('converter-source-date-display') as HTMLButtonElement | null;
  const sourceDateInput = document.getElementById('converter-source-date-input') as HTMLInputElement | null;
  const targetSelect = document.getElementById('converter-target-zone') as HTMLSelectElement | null;
  const targetZoneName = document.getElementById('converter-target-zone-name');
  const targetTime = document.getElementById('converter-target-time');
  const targetPeriod = document.getElementById('converter-target-period');
  const targetDate = document.getElementById('converter-target-date');
  const relative = document.getElementById('converter-relative');
  const hint = document.getElementById('converter-hint');

  if (
    !swapButton ||
    !sourceSelect ||
    !sourceZoneName ||
    !sourceTimeInput ||
    !sourceDateDisplay ||
    !sourceDateInput ||
    !targetSelect ||
    !targetZoneName ||
    !targetTime ||
    !targetPeriod ||
    !targetDate ||
    !relative ||
    !hint
  ) {
    return null;
  }

  return {
    swapButton,
    sourceSelect,
    sourceZoneName,
    sourceTimeInput,
    sourceDateDisplay,
    sourceDateInput,
    targetSelect,
    targetZoneName,
    targetTime,
    targetPeriod,
    targetDate,
    relative,
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

function getDefaultConverterState(): ConverterState {
  const nowParts = partsToWall(getZonedDateTimeParts(new Date(), DEFAULT_SOURCE_TIMEZONE));
  return {
    sourceTimeZone: DEFAULT_SOURCE_TIMEZONE,
    targetTimeZone: DEFAULT_TARGET_TIMEZONE,
    date: formatDateInputValue(nowParts),
    time: formatTimeInputValue(nowParts),
  };
}

function loadConverterState(): ConverterState | null {
  const raw = localStorage.getItem(CONVERTER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ConverterState>;
    if (
      typeof parsed.sourceTimeZone !== 'string' ||
      typeof parsed.targetTimeZone !== 'string' ||
      typeof parsed.date !== 'string' ||
      typeof parsed.time !== 'string' ||
      !isSupportedTimeZone(parsed.sourceTimeZone) ||
      !isSupportedTimeZone(parsed.targetTimeZone) ||
      !parseWallTime(parsed.date, parsed.time)
    ) {
      return null;
    }

    return {
      sourceTimeZone: parsed.sourceTimeZone,
      targetTimeZone: parsed.targetTimeZone,
      date: parsed.date,
      time: parsed.time,
    };
  } catch {
    return null;
  }
}

function saveConverterState(state: ConverterState): void {
  localStorage.setItem(CONVERTER_STORAGE_KEY, JSON.stringify(state));
}

function updateSelectionHint(elements: ConverterElements, sourceLabel: string, targetLabel: string): void {
  void sourceLabel;
  void targetLabel;
  elements.hint.textContent = '';
}

function performConversion(elements: ConverterElements, persistState: boolean): void {
  if (!converterState) {
    return;
  }

  const sourceZone = findZoneByTimeZone(converterState.sourceTimeZone);
  const targetZone = findZoneByTimeZone(converterState.targetTimeZone);
  const requestedWall = parseWallTime(converterState.date, converterState.time);

  if (!sourceZone || !targetZone || !requestedWall) {
    elements.hint.textContent = 'Enter a valid source date and time.';
    elements.relative.textContent = '';
    return;
  }

  const result = resolveSourceInstant(sourceZone.timeZone, requestedWall);
  const sourceWall = partsToWall(getZonedDateTimeParts(result.instant, sourceZone.timeZone));
  const targetWall = partsToWall(getZonedDateTimeParts(result.instant, targetZone.timeZone));

  if (result.status === 'invalid-adjusted') {
    converterState.date = formatDateInputValue(sourceWall);
    converterState.time = formatTimeInputValue(sourceWall);
    elements.sourceDateInput.value = converterState.date;
    elements.sourceTimeInput.value = converterState.time;
  }
  elements.sourceDateDisplay.textContent = formatWallDateLabel(sourceWall);

  const targetTimeParts = formatConverterClockTime(result.instant, targetZone.timeZone);
  const targetDateLabel = formatConverterDate(result.instant, targetZone.timeZone);
  const sourceTimeZoneName = getTimeZoneNameAtInstant(result.instant, sourceZone.timeZone);
  const targetTimeZoneName = getTimeZoneNameAtInstant(result.instant, targetZone.timeZone);

  const diffMinutes = (wallToMinuteEpoch(targetWall) - wallToMinuteEpoch(sourceWall)) / 60_000;

  elements.sourceZoneName.textContent = sourceTimeZoneName;
  elements.targetZoneName.textContent = targetTimeZoneName;
  elements.targetTime.textContent = targetTimeParts.time;
  elements.targetPeriod.textContent = targetTimeParts.period;
  elements.targetDate.textContent = targetDateLabel;
  elements.relative.textContent = describeRelativeTime(sourceZone.label, targetZone.label, diffMinutes);

  const dstHint = buildDstHint(result, sourceZone.label);
  if (dstHint) {
    elements.hint.textContent = `${dstHint} Editing ${sourceZone.label}.`;
  } else {
    updateSelectionHint(elements, sourceZone.label, targetZone.label);
  }

  if (persistState) {
    saveConverterState(converterState);
  }
}

function syncInputsFromState(elements: ConverterElements): void {
  if (!converterState) {
    return;
  }

  elements.sourceSelect.value = converterState.sourceTimeZone;
  elements.targetSelect.value = converterState.targetTimeZone;
  elements.sourceDateInput.value = converterState.date;
  elements.sourceTimeInput.value = converterState.time;
  const wall = parseWallTime(converterState.date, converterState.time);
  elements.sourceDateDisplay.textContent = wall ? formatWallDateLabel(wall) : '';
}

function updateStateFromInputs(elements: ConverterElements): void {
  if (!converterState) {
    return;
  }

  converterState = {
    ...converterState,
    sourceTimeZone: elements.sourceSelect.value,
    targetTimeZone: elements.targetSelect.value,
    date: elements.sourceDateInput.value,
    time: elements.sourceTimeInput.value,
  };
}

function swapConverterValues(elements: ConverterElements): void {
  if (!converterState) {
    return;
  }

  converterState = {
    ...converterState,
    sourceTimeZone: converterState.targetTimeZone,
    targetTimeZone: converterState.sourceTimeZone,
  };

  syncInputsFromState(elements);
  performConversion(elements, true);
}

function initConverter(): void {
  const elements = getConverterElements();
  if (!elements) {
    return;
  }

  converterElements = elements;
  populateZoneSelect(elements.sourceSelect);
  populateZoneSelect(elements.targetSelect);
  converterState = loadConverterState() ?? getDefaultConverterState();
  syncInputsFromState(elements);

  elements.swapButton.addEventListener('click', () => {
    swapConverterValues(elements);
  });

  const onInputChange = (): void => {
    updateStateFromInputs(elements);
    performConversion(elements, true);
  };

  elements.sourceTimeInput.addEventListener('input', onInputChange);
  elements.sourceTimeInput.addEventListener('change', onInputChange);
  elements.sourceDateInput.addEventListener('input', onInputChange);
  elements.sourceDateInput.addEventListener('change', onInputChange);
  elements.sourceSelect.addEventListener('change', onInputChange);
  elements.targetSelect.addEventListener('change', onInputChange);
  elements.sourceDateDisplay.addEventListener('click', () => {
    if (typeof elements.sourceDateInput.showPicker === 'function') {
      elements.sourceDateInput.showPicker();
      return;
    }
    elements.sourceDateInput.focus();
    elements.sourceDateInput.click();
  });

  performConversion(elements, false);
}

function refreshConverterForFormatChange(): void {
  if (!converterElements) {
    return;
  }

  performConversion(converterElements, false);
}

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
