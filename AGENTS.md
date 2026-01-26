# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Vanilla JavaScript world clock web app displaying real-time clocks for 7 time zones (UTC, Helsinki, Manila, San Francisco, Beijing, Netherlands, Sydney) with automatic dark mode support and time format toggle (12H/24H). No build process or dependencies required.

## Development Workflow

### Testing
Open `index.html` directly in a browser - the app works offline and requires no build step.

### Deployment
Static file hosting only. GitHub Pages, Netlify, Vercel, or any static host will work.

## Architecture

### Core Files
- **`index.html`**: Single-page app with embedded dark mode detection script (lines 52-71) and static clock cards for each timezone
- **`script.js`**: Clock logic using `Intl.DateTimeFormat` and timezone-aware Date objects. Global `is24Hour` state controls all clocks simultaneously
- **`styles.css`**: CSS custom properties for theming (`:root` and `.dark-theme` selectors) with automatic dark mode via `prefers-color-scheme`

### Time Zone Configuration
Timezones use IANA identifiers in `script.js` `updateClocks()` function:
- `'UTC'`
- `'Europe/Helsinki'`
- `'Asia/Manila'`
- `'America/Los_Angeles'`
- `'Asia/Shanghai'`
- `'Europe/Amsterdam'`
- `'Australia/Sydney'`

Each clock card has structured element IDs: `{location}-time`, `{location}-date`, `{location}-location` (e.g., `helsinki-time`, `helsinki-date`, `helsinki-location`).

### Theme System
- No manual theme toggle - follows system preference only
- Inline script in `<head>` (lines 52-71 of `index.html`) detects dark mode using `matchMedia('(prefers-color-scheme: dark)')` and adds `dark-theme` class to `<html>`
- Listens for system theme changes in real-time

### Time Formatting Pattern
- Uses `toLocaleTimeString()` with dynamic options from `getTimeOptions()` based on `is24Hour` state
- AM/PM uppercase conversion: `.replace(/am|pm/i, (match) => match.toUpperCase())`
- Date formatting uses `'en-GB'` locale with full date options (`dateOptions` constant)

### Real-time Updates
- `setInterval(updateClocks, 1000)` updates all 7 clocks every second
- Single `updateClocks()` function calls `updateClock()` for each timezone
- `updateClock()` function updates time, date, and day/night indicator (☀️ for 6 AM - 6 PM, 🌙 otherwise)

### Day/Night Indicators
- Each location displays ☀️ (daytime) or 🌙 (nighttime) via `data-daynight` attribute on `.location` element
- Updated by `isDaytime(hour)` function checking if hour is between 6 and 18 in local time for each zone
- Rendered via CSS `::after` pseudo-element: `.location::after { content: attr(data-daynight); }`

## Adding New Time Zones

1. Add clock card HTML structure in `index.html` with consistent ID pattern:
   ```html
   <div class="clock-card">
     <div id="{location}-location" class="location">🌎 Location Name</div>
     <div id="{location}-timezone" class="timezone">UTC±X</div>
     <div id="{location}-time" class="time">00:00:00</div>
     <div id="{location}-date" class="date"></div>
   </div>
   ```
2. Add corresponding `updateClock('IANA/Timezone', '{location}-time', '{location}-date', '{location}-location')` call in `updateClocks()` function in `script.js`
3. Grid layout auto-adjusts via `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`

## CSS Architecture

- Mobile-first responsive design with single breakpoint at `@media (max-width: 768px)`
- Consistent spacing using `rem` units
- Hover animations on clock cards: `transform: translateY(-5px)` with shadow transition
- CSS Grid for responsive clock layout with auto-fit columns

## Key Patterns

### Global State
`is24Hour` boolean in `script.js` controls time format for all clocks. Modified by format toggle buttons with `data-format` attribute.

### Time Display
- Time: `'Space Mono'` monospace font, 2.5rem (2.2rem on mobile)
- Date: `'Space Mono'` monospace font, 14px, tertiary text color
- Location: `'Inter'` sans-serif, 1.1rem, secondary text color

### CSS Custom Properties
Light theme in `:root`, dark theme in `.dark-theme` class. All colors use CSS variables:
- `--bg-color`, `--card-bg`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--shadow-color`, `--shadow-color-hover`
- `--heading-color`
