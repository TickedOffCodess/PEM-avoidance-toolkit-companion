# PEM Avoidance Toolkit

A progressive web app for tracking post-exertional malaise, based on the Stanford PEM Avoidance Toolkit, hosted by the [Open Medicine Foundation](https://omf.ngo/pem-avoidance-toolkit).

**All data stays on the user's device.** Nothing is ever sent to a server.

## Features

### Daily Tracking
- **Track** daily activity levels (physical, mental, emotional) on the OMF 0-10 scale
- **Log symptoms** (fatigue, pain, nausea/GI, brain fog, plus a custom "other" symptom) three times daily (AM, midday, PM)
- **Mark crashes** and add comments about what happened
- **Delete entries** to correct mistakes or remove test data
- **Daily logging reminder** — dismissible banner when today's entry is missing

### Analysis & Insights
- **Pattern analysis** comparing crash vs non-crash days, pre-crash activity levels (1-5 day lookback), and sleep quality correlations
- **Correlation matrix** — Pearson correlations across all activity and symptom fields to surface hidden connections
- **30-day heatmap** — color-coded overview of recent activity levels at a glance
- **Crash risk indicator** — real-time warning when your 3-day activity average exceeds your safe ceiling (mean + 1 standard deviation)

### Planning & Export
- **Crash Avoidance Plan** builder using the full OMF causes, barriers, and strategies checklists
- **Export** tracking data and your plan as formatted text to share with doctors or support team
- **CSV export** — download tracking data as a spreadsheet-ready CSV file
- **Backup & restore** — JSON export/import so you never lose your data
- **Print-friendly report** — clean browser print layout for doctor visits

### Usability
- **Onboarding tour** — 4-step guided walkthrough for new users
- **Dark/Light theme** toggle
- **Works offline** after first load via service worker
- **Add to Home Screen** for a native app experience on iOS and Android
- **Lazy loading** — code-split views for faster initial load

## Reliability & Security

- Correct timezone handling throughout (local dates, never UTC drift)
- Zero-valued activity and symptom scores are properly stored and displayed
- Input validation enforces the 0-10 scale on all fields
- Focus trap and Escape-to-close in all modals for keyboard accessibility
- Service worker only caches successful responses
- CSV export guards against formula injection (`=`, `+`, `-`, `@`)
- Backup import validates keys against a whitelist to prevent prototype pollution

## Deploy to GitHub Pages

### Option 1: Upload built files (no command line needed)

1. On your computer, install [Node.js](https://nodejs.org/) (version 18+)
2. Unzip this project, open a terminal in the folder, and run:
   ```
   npm install
   npm run build
   ```
3. Create a new GitHub repository (public)
4. Upload everything inside the `dist/` folder to the repository
5. Go to **Settings > Pages > Source: Deploy from a branch** (main, root)
6. Your app will be live at `https://yourusername.github.io/repo-name/`

### Option 2: Deploy with gh-pages (command line)

1. Create a new GitHub repository and clone it
2. Copy these project files into the repo folder
3. Run:
   ```
   npm install
   npm run build
   npm run deploy
   ```
4. Go to **Settings > Pages > Source: Deploy from a branch** (gh-pages, root)

## Development

```
npm install
npm run dev
```

Opens a local dev server at http://localhost:5173

## Project Structure

```
src/
  App.jsx          - Main app with state, navigation, onboarding, export (views are lazy-loaded)
  TrackView.jsx    - Daily tracking, weekly calendar, recent entries, heatmap
  PatternsView.jsx - Crash correlations, trends, pre-crash analysis, crash risk
  PlanView.jsx     - OMF crash avoidance plan builder
  LearnView.jsx    - Educational reference material
  DayEditor.jsx    - Modal form for logging a day (with input validation)
  components.jsx   - Shared UI components (sparklines, symptom rows)
  omfData.js       - OMF causes, barriers, strategies data
  db.js            - IndexedDB storage layer
  utils.js         - Helper functions, correlations, crash risk, export generator
  index.css        - CSS variables and base styles
  main.jsx         - Entry point and service worker registration
public/
  manifest.json    - PWA manifest
  sw.js            - Service worker for offline support
  icon.svg         - App icon
```

## Testing

```
npm test          # unit tests (Vitest + jsdom)
npm run build     # production build
```

## Based on

The PEM Avoidance Toolkit, developed at Stanford by Jeff Hewitt, Sarah Hewitt, Dana Beltramo Hewitt, Dr. Bonilla, and Dr. Montoya with input from ME/CFS patients. Hosted online by the Open Medicine Foundation.

Full toolkit: [omf.ngo/pem-avoidance-toolkit](https://omf.ngo/pem-avoidance-toolkit)
