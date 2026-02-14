import { ZONE_OPTIONS, type ZoneOption } from './clock-zones';
import {
  dateOptions,
  getClockTimeOptions,
  getUtcOffsetLabelAtInstant,
  getZonedDateTimeParts,
  isDaytime,
} from './clock-time';
import { initConverter, refreshConverterForFormatChange } from './converter';

let is24Hour = true;

function updateClock(zone: ZoneOption, now: Date): void {
  const parts = getZonedDateTimeParts(now, zone.timeZone);

  let timeString = now.toLocaleTimeString('en-US', {
    timeZone: zone.timeZone,
    ...getClockTimeOptions(is24Hour),
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
    document.querySelectorAll('.time-format-btn').forEach((btn) =>
      btn.removeAttribute('data-active'),
    );
    (button as HTMLElement).setAttribute('data-active', '');

    const format = (button as HTMLElement).dataset.format;
    is24Hour = format === '24';

    updateClocks();
    refreshConverterForFormatChange(is24Hour);
  });
});

const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

initConverter(() => is24Hour);
updateClocks();
setInterval(updateClocks, 1000);
