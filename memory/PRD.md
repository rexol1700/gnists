# MyBoard — Product Requirements Document

## Original Problem Statement
> "I want to add two more panels to my myboard project. A calendar and a habit tracker"

### User-confirmed choices (1st clarification round)
- **Calendar**: Full-featured month/week/day view. *No* category tagging (user feedback: "it's your calendar — doesn't matter if work or personal").
- **Habit Tracker**: Habits with categories, reminders, goals, and analytics chart (progress chart).
- **Persistence**: Backend (server-stored per user). MyBoard uses Express + sql.js (SQLite), which already persists per-user via the existing `items` table — the new panels reuse it.
- **Design**: Match the existing MyBoard panel style (warm paper, sage/coral accents, Instrument Serif headings, Geist sans body).
- **Behaviour**: New panels must function in conjunction with existing panels (drag/resize, hide, dark-mode, layout persistence).

## Architecture
- **Frontend**: Vanilla JS in `/app/public/`, served by Express on port 3000.
- **Backend (logic)**: Node.js + Express in `/app/server/index.js`, port 3000. SQLite via sql.js. JWT auth.
- **Backend (proxy)**: FastAPI at `/app/backend/server.py` on port 8001 — Kubernetes ingress routes `/api/*` to 8001, this proxy forwards everything to Express on localhost:3000.
- **Frontend supervisor shim**: `/app/frontend/package.json` `start` runs `node ../server/index.js` so supervisor's `yarn start` works.

## User Personas
1. **Personal-canvas user** — uses MyBoard daily for a mix of tasks, notes, reminders. Now adds Calendar to track meetings and Habits to keep a daily routine streak.
2. **Trial user** — discovers calendar + habits as part of the standard panel picker during/after onboarding.

## Core Static Requirements
- All existing panels must keep working (Questions, Keywords, Tasks, Reminders, Notes, Meals, Bills, Times, Selling, Shopping, Motivations, Learning).
- New panels integrate via existing `panelRegistry` + `panelRenderers` dispatcher pattern.
- Data persists per user via the existing `items` table (`list_name='calendar'` or `'habits'`, `extra` holds JSON).
- Layout (which panels are on the board, in what order, with what flex) stays in client localStorage — same as today.

## What's been implemented — 2026-01-24

### Panel: Calendar (`id: 'calendar'`)
- Three views: **Month** (6-row × 7-col grid), **Week** (7-column day cards), **Day** (chronological event list).
- Prev / Today / Next navigation aware of the active view (month ±1 month, week ±7d, day ±1d).
- Today is auto-highlighted (filled ink circle on the date number).
- Click an empty day → modal editor for new event.
- Click an existing event chip → modal editor in edit mode (with Delete button).
- Event editor: title (required), date (date picker), time (time picker, optional → renders as "All day"), description (textarea), color (sage / coral / ink / amber / blue swatch).
- Server-persisted via existing `POST/PATCH/DELETE /api/data/...` endpoints; `extra` stores `JSON.stringify({date, time, desc, color})`.
- Item count badge on the panel header shows total events.

### Panel: Habit Tracker (`id: 'habits'`)
- Three views: **Today** (list of habits with one-tap check-off), **Week** (Mon→Sun 7-day grid per habit, click any cell to toggle a past day; future days disabled), **Stats** (per-habit card with 4 metrics + 30-day bar chart).
- Adding a habit = single-line input + Enter. Server-persisted with default `extra = {category:'',target:7,reminder:'',goal:'',completions:[]}`.
- One-tap toggle (sage check circle) marks/unmarks today; fires PATCH to update `completions: [YYYY-MM-DD, ...]`.
- Expand a habit (▼ chevron) to edit category, weekly target (1–7), reminder time, and goal text — Save persists.
- Streak badge ("🔥 N") appears when the active streak ≥ 1.
- Stats card shows: **completions in last 30 days** (`x/30`), **completion rate %**, **current streak**, **best streak**, plus a sparkline (30 small bars, sage when completed).
- Item count badge on the panel header shows total habits.

### Plumbing changes
- `panelRegistry.js`: two new entries (`calendar` span=2, `habits` span=1).
- `panelRenderers.js`: dispatcher cases added for `'calendar'` and `'habits'`.
- `calendarHabits.js`: new file holding all calendar/habits render functions + date helpers.
- `controller.js`: appended ~12 calendar + 7 habit functions (navigation, CRUD, view toggles, editor open/close/save).
- `model.js`: added state for `lists.calendar`, `lists.habits`, calendar cursor/view/editor flags, habits view/expand state.
- `i18n.js`: added all `sec_calendar`, `sec_habits`, `cal_*`, `hab_*`, full month names `mof_*` and short weekday names `wds_*` for EN + NO.
- `index.html`: registered the new `calendarHabits.js` script tag.
- `style.css`: appended a self-contained "CALENDAR + HABITS PANELS" section with event-color tokens, dark-mode tweaks, and responsive fallback under 720px.
- Renamed `/app/public/api.js` → `myboard-client.js` (and updated the script tag) because the platform's `/api*` ingress rule was hijacking it.

### Persistence & isolation
- Per-user, server-side (SQLite). Verified by the testing subagent: 16/16 backend tests passing, including cross-user isolation.

## Backlog / Future ideas (not in scope)
### P1
- Recurring events (daily / weekly / monthly) for the calendar.
- Native push reminders (right now habit "reminder" is just a stored time; no notification firing).
- iCal / Google Calendar import-export.

### P2
- Habit categories surfaced as filter tabs in Week/Stats views.
- Drag-to-create event in Week view (click-drag from start to end time).
- Per-habit goal completion progress (e.g. "3/5 sessions this week" badge).
- Heatmap (12-week or 365-day) for Stats view.

### P0 / Smart enhancement
- **One-click "add to calendar" from existing panels** — e.g. on a Reminder with a due date, surface a "→ add to calendar" affordance so the user doesn't enter the same event twice. Boosts cross-panel value and stickiness.

## Tasks completed
- [x] Clarify scope with user (calendar full views; habits with categories+reminders+goals+stats; backend persistence; match style)
- [x] Bootstrap Express + FastAPI proxy under platform supervisor (port 3000 / 8001)
- [x] Rename `/api.js` → `/myboard-client.js` to dodge ingress
- [x] Register `calendar` and `habits` in panelRegistry
- [x] Implement Calendar panel (month/week/day, modal editor, 5 colors)
- [x] Implement Habit Tracker (today/week/stats, inline editor, streak, 30-bar chart)
- [x] Add EN + NO i18n strings
- [x] Append CSS for both panels (light + dark mode)
- [x] Verified end-to-end (testing subagent — 16/16 backend tests pass; UI flows verified)

## Next Action Items
- Demo to user — let them try drag-resizing the new panels and using them across a few days.
- Potential P0 hook: surface a "Add to calendar" affordance on Reminders with a date.
