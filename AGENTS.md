# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Astro-powered static site world clock displaying real-time clocks for 7 time zones (UTC, Helsinki, Manila, San Francisco, Beijing, Netherlands, Sydney) with automatic dark mode support and time format toggle (12H/24H). Built with Astro + Vite + Tailwind CSS v4 using TypeScript.

## Development Workflow

### Development
- `pnpm run dev` - Start Astro dev server on localhost:4321
- `pnpm run build` - Build static site to `dist/` directory
- `pnpm run preview` - Preview production build locally

### Deployment
Static site generation. Build output in `dist/` can be deployed to any static host (GitHub Pages, Netlify, Vercel, etc.).

## Architecture

### Core Files
- **`src/pages/index.astro`**: Main page with embedded dark mode detection script (lines 56-75) and static clock cards styled with Tailwind utility classes
- **`src/scripts/clock.ts`**: TypeScript module with clock logic using `Intl.DateTimeFormat` and timezone-aware Date objects. Global `is24Hour` state controls all clocks simultaneously. Uses data attributes for button active states
- **`src/styles/global.css`**: Tailwind CSS import with custom font configuration using `@theme` directive. Minimal custom CSS for day/night indicator pseudo-element
- **`public/assets/`**: Static assets (favicons, OG images) served from `/assets/` path
- **`astro.config.mjs`**: Astro configuration with `@tailwindcss/vite` plugin for Tailwind v4 support
- **`tsconfig.json`**: TypeScript configuration extending Astro strict preset

### Time Zone Configuration
Timezones use IANA identifiers in `src/scripts/clock.ts` `updateClocks()` function:
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
- Inline script in `<head>` (lines 56-75 of `src/pages/index.astro`) with `is:inline` directive detects dark mode using `matchMedia('(prefers-color-scheme: dark)')` and adds `dark` class to `<html>`
- Listens for system theme changes in real-time
- Script uses `is:inline` to prevent Astro from bundling it (required to run before page render to prevent theme flash)
- All styling uses Tailwind's `dark:` variant for dark mode colors

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

1. Add clock card HTML structure in `src/pages/index.astro` with consistent ID pattern and Tailwind classes:
   ```html
   <div class="bg-white dark:bg-gray-700 rounded-xl px-8 py-6 shadow-[0_10px_25px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.2)] transition-all duration-300 relative overflow-hidden min-w-[280px] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] md:px-6 md:py-5">
     <div id="{location}-location" class="location text-lg text-gray-700 dark:text-gray-300 mb-2 font-semibold flex items-center gap-2">🌎 Location Name</div>
     <div id="{location}-timezone" class="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono">UTC±X</div>
     <div id="{location}-time" class="text-4xl font-mono font-light text-gray-900 dark:text-gray-50 tracking-wide mb-4 whitespace-nowrap flex items-center gap-2 md:text-[2.2rem] md:tracking-normal">00:00:00</div>
     <div id="{location}-date" class="text-sm text-gray-500 dark:text-gray-400 font-mono tracking-wide"></div>
   </div>
   ```
2. Add corresponding `updateClock('IANA/Timezone', '{location}-time', '{location}-date', '{location}-location')` call in `updateClocks()` function in `src/scripts/clock.ts`
3. Grid layout auto-adjusts via Tailwind's `grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))]`

## CSS Architecture

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- Mobile-first responsive design using Tailwind's `md:` breakpoint (768px)
- Consistent spacing using Tailwind's spacing scale
- Hover animations on clock cards: `hover:-translate-y-1` with shadow transitions
- CSS Grid for responsive clock layout using `grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))]`
- Dark mode support via `dark:` variant with system preference detection
- Custom fonts configured in `@theme` block: Inter (sans) and Space Mono (mono)

## Key Patterns

### Global State
`is24Hour` boolean in `src/scripts/clock.ts` controls time format for all clocks. Modified by format toggle buttons with `data-format` attribute. Active button state uses `data-active` attribute with Tailwind's `data-[active]:` selector.

### Time Display
- Time: `font-mono` (Space Mono), `text-4xl` (2.5rem) with `md:text-[2.2rem]` on mobile
- Date: `font-mono` (Space Mono), `text-sm` (14px), `text-gray-500 dark:text-gray-400`
- Location: `font-sans` (Inter), `text-lg` (1.1rem), `text-gray-700 dark:text-gray-300`

### Tailwind Color Palette
Light/dark themes use Tailwind's built-in color scales:
- Background: `bg-gray-100` / `dark:bg-gray-900`
- Cards: `bg-white` / `dark:bg-gray-700`
- Text primary: `text-gray-900` / `dark:text-gray-50`
- Text secondary: `text-gray-700` / `dark:text-gray-300`
- Text tertiary: `text-gray-500` / `dark:text-gray-400`
- Accent: `text-blue-900` / `dark:text-blue-300`
- Shadows: Custom RGBA values via arbitrary values `shadow-[...]`
