// Time format state
let is24Hour = true;

// Format options for time display
function getTimeOptions(): Intl.DateTimeFormatOptions {
  return {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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

// Function to determine if it's day or night
function isDaytime(hour: number): boolean {
  return hour >= 6 && hour < 18; // Day time is between 6 AM and 6 PM
}

// Function to update a single clock
function updateClock(timeZone: string, timeId: string, dateId: string, locationId: string): void {
  const timeInZone = new Date(new Date().toLocaleString('en-US', { timeZone }));
  const hour = timeInZone.getHours();

  // Update time
  let timeString = timeInZone.toLocaleTimeString(
    'en-US', // Changed from en-GB to en-US for consistent AM/PM formatting
    getTimeOptions()
  );

  // Convert am/pm to uppercase
  timeString = timeString.replace(/am|pm/i, (match) => match.toUpperCase());

  const timeElement = document.getElementById(timeId);
  if (timeElement) {
    timeElement.textContent = timeString;
  }

  // Update date
  const dateElement = document.getElementById(dateId);
  if (dateElement) {
    dateElement.textContent = timeInZone.toLocaleDateString('en-GB', dateOptions);
  }

  // Update day/night indicator
  const locationElement = document.getElementById(locationId);
  if (locationElement) {
    const dayNightIcon = isDaytime(hour) ? '🌞' : '🌚';
    locationElement.dataset.daynight = dayNightIcon;
  }
}

function updateClocks(): void {
  // Update all clocks with their respective timezones
  updateClock('UTC', 'utc-time', 'utc-date', 'utc-location');
  updateClock('Europe/Helsinki', 'helsinki-time', 'helsinki-date', 'helsinki-location');
  updateClock('Asia/Manila', 'manila-time', 'manila-date', 'manila-location');
  updateClock('America/Los_Angeles', 'san-francisco-time', 'san-francisco-date', 'sf-location');
  updateClock('Asia/Shanghai', 'beijing-time', 'beijing-date', 'beijing-location');
  updateClock('Europe/Amsterdam', 'netherlands-time', 'netherlands-date', 'netherlands-location');
  updateClock('Australia/Sydney', 'sydney-time', 'sydney-date', 'sydney-location');
}

// Handle time format toggle
document.querySelectorAll('.time-format-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    // Update active state
    document.querySelectorAll('.time-format-btn').forEach((b) => b.removeAttribute('data-active'));
    (btn as HTMLElement).setAttribute('data-active', '');

    // Update time format
    const format = (btn as HTMLElement).dataset.format;
    is24Hour = format === '24';

    // Update all clocks immediately
    updateClocks();
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

// Initial update
updateClocks();

// Update every second
setInterval(updateClocks, 1000);
