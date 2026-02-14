export type DstStatus = 'normal' | 'ambiguous' | 'invalid-adjusted';

export type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type ZonedDateTimeParts = WallTime & {
  second: number;
};

export type ConversionResult = {
  instant: Date;
  status: DstStatus;
  adjustedWall?: WallTime;
};

export const dateOptions: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

export function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function isDaytime(hour: number): boolean {
  return hour >= 6 && hour < 18;
}

export function getClockTimeOptions(is24Hour: boolean): Intl.DateTimeFormatOptions {
  return {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !is24Hour,
  };
}

export function getConverterTimeOptions(is24Hour: boolean): Intl.DateTimeFormatOptions {
  return {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !is24Hour,
  };
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

export function getZonedDateTimeParts(date: Date, timeZone: string): ZonedDateTimeParts {
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

export function wallToMinuteEpoch(wall: WallTime): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, 0, 0);
}

export function partsToWall(parts: ZonedDateTimeParts): WallTime {
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function isSameWallMinute(a: WallTime, b: WallTime): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute
  );
}

export function parseWallTime(dateValue: string, timeValue: string): WallTime | null {
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

export function formatDateInputValue(wall: WallTime): string {
  return `${wall.year}-${pad2(wall.month)}-${pad2(wall.day)}`;
}

export function formatTimeInputValue(wall: WallTime): string {
  return `${pad2(wall.hour)}:${pad2(wall.minute)}`;
}

export function formatWallDateLabel(wall: WallTime): string {
  const date = new Date(Date.UTC(wall.year, wall.month - 1, wall.day, 12));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatWallForHint(wall: WallTime): string {
  return `${formatDateInputValue(wall)} ${formatTimeInputValue(wall)}`;
}

export function getTimeZoneNameAtInstant(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
}

export function getUtcOffsetLabelAtInstant(date: Date, timeZone: string): string {
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

export function formatConverterClockTime(
  instant: Date,
  timeZone: string,
  is24Hour: boolean,
): { time: string; period: string } {
  const formatted = instant
    .toLocaleTimeString('en-US', {
      timeZone,
      ...getConverterTimeOptions(is24Hour),
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

export function formatConverterDate(instant: Date, timeZone: string): string {
  return instant.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatHourMinuteDifference(diffMinutes: number): string {
  const absoluteMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `${hours}:${pad2(minutes)} hours`;
}

export function describeRelativeTime(sourceLabel: string, targetLabel: string, diffMinutes: number): string {
  if (diffMinutes === 0) {
    return `${targetLabel} and ${sourceLabel} currently share the same local time.`;
  }

  const diffText = formatHourMinuteDifference(diffMinutes);
  if (diffMinutes > 0) {
    return `${targetLabel} time is ${diffText} ahead of ${sourceLabel}.`;
  }

  return `${targetLabel} time is ${diffText} behind ${sourceLabel}.`;
}

export function resolveSourceInstant(timeZone: string, requestedWall: WallTime): ConversionResult {
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
    if (
      !nearest ||
      wallDiff < nearest.wallDiff ||
      (wallDiff === nearest.wallDiff && candidateMs < nearest.instantMs)
    ) {
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

export function buildDstHint(result: ConversionResult, sourceLabel: string): string {
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
