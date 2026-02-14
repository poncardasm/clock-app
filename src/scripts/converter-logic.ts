import {
  CONVERTER_STORAGE_KEY,
  DEFAULT_SOURCE_TIMEZONE,
  DEFAULT_TARGET_TIMEZONE,
} from './clock-zones';
import {
  type ConversionResult,
  buildDstHint,
  formatConverterClockTime,
  formatConverterDate,
  formatDateInputValue,
  formatHourMinuteDifference,
  formatTimeInputValue,
  formatWallDateLabel,
  getTimeZoneNameAtInstant,
  getZonedDateTimeParts,
  parseWallTime,
  partsToWall,
  resolveSourceInstant,
  wallToMinuteEpoch,
} from './clock-time';
import {
  findTimeZoneOptionByTimeZone,
  getTimeZoneOptions,
  isSupportedTimeZone,
} from './converter-timezones';

export type ConverterState = {
  sourceTimeZone: string;
  targetTimeZone: string;
  date: string;
  time: string;
};

export type ConverterViewData = {
  state: ConverterState;
  sourceZoneName: string;
  targetZoneName: string;
  targetTime: string;
  targetPeriod: string;
  targetDate: string;
  relativeText: string;
  relativeEmphasis: string;
  relativeTail: string;
  hint: string;
  sourceDateDisplay: string;
};

export function getDefaultConverterState(): ConverterState {
  const options = getTimeZoneOptions();
  const fallbackTimeZone = options[0]?.timeZone ?? 'UTC';
  const sourceTimeZone = isSupportedTimeZone(DEFAULT_SOURCE_TIMEZONE)
    ? DEFAULT_SOURCE_TIMEZONE
    : fallbackTimeZone;
  const targetTimeZone = isSupportedTimeZone(DEFAULT_TARGET_TIMEZONE)
    ? DEFAULT_TARGET_TIMEZONE
    : sourceTimeZone;

  const nowParts = partsToWall(getZonedDateTimeParts(new Date(), sourceTimeZone));

  return {
    sourceTimeZone,
    targetTimeZone,
    date: formatDateInputValue(nowParts),
    time: formatTimeInputValue(nowParts),
  };
}

export function loadConverterState(): ConverterState | null {
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

export function saveConverterState(state: ConverterState): void {
  localStorage.setItem(CONVERTER_STORAGE_KEY, JSON.stringify(state));
}

export function computeConverterViewData(
  state: ConverterState,
  is24Hour: boolean,
): ConverterViewData | null {
  const sourceZone = findTimeZoneOptionByTimeZone(state.sourceTimeZone);
  const targetZone = findTimeZoneOptionByTimeZone(state.targetTimeZone);
  const requestedWall = parseWallTime(state.date, state.time);

  if (!sourceZone || !targetZone || !requestedWall) {
    return null;
  }

  const result: ConversionResult = resolveSourceInstant(sourceZone.timeZone, requestedWall);
  const sourceWall = partsToWall(getZonedDateTimeParts(result.instant, sourceZone.timeZone));
  const targetWall = partsToWall(getZonedDateTimeParts(result.instant, targetZone.timeZone));

  const nextState: ConverterState = {
    ...state,
    date: formatDateInputValue(sourceWall),
    time: formatTimeInputValue(sourceWall),
  };

  const targetTimeParts = formatConverterClockTime(
    result.instant,
    targetZone.timeZone,
    is24Hour,
  );
  const targetDateLabel = formatConverterDate(result.instant, targetZone.timeZone);
  const sourceTimeZoneName = getTimeZoneNameAtInstant(result.instant, sourceZone.timeZone);
  const targetTimeZoneName = getTimeZoneNameAtInstant(result.instant, targetZone.timeZone);

  const diffMinutes = (wallToMinuteEpoch(targetWall) - wallToMinuteEpoch(sourceWall)) / 60_000;

  let relativeBase = `${targetZone.label} time is `;
  let relativeEmphasis: string;
  let relativeTail = ` of ${sourceZone.label}.`;

  if (diffMinutes === 0) {
    relativeBase = `${targetZone.label} and ${sourceZone.label} currently `;
    relativeEmphasis = 'share the same local time';
    relativeTail = '.';
  } else {
    const diffText = formatHourMinuteDifference(diffMinutes);
    relativeEmphasis = diffMinutes > 0 ? `${diffText} ahead` : `${diffText} behind`;
  }

  return {
    state: nextState,
    sourceZoneName: sourceTimeZoneName,
    targetZoneName: targetTimeZoneName,
    targetTime: targetTimeParts.time,
    targetPeriod: targetTimeParts.period,
    targetDate: targetDateLabel,
    relativeText: relativeBase,
    relativeEmphasis,
    relativeTail,
    hint: buildDstHint(result, sourceZone.label),
    sourceDateDisplay: formatWallDateLabel(sourceWall),
  };
}
