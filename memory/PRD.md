# MyBoard Mobile (Flutter) — PRD

## Original problem statement
> Build a mobile app: From my webapp "myboard" create a multiplatform app with dart and flutter. So that it works on ios and android

Source webapp: https://github.com/rexol1700/gnists (live at https://myboard.org)
Stack: Node.js + Express + SQLite + bcrypt JWT auth, Anthropic Haiku 4.5 AI buttons, Stripe paywall.

## Architecture
- Single Flutter project at `/app/mobile`
- Targets: **iOS + Android** (web works for smoke tests but isn't a target)
- Talks to existing backend at `https://myboard.org` (override with `--dart-define=API_BASE=...`)
- State: lightweight `ChangeNotifier` (`AppState`), `SharedPreferences` for persistence
- HTTP: `package:http`. Auth via Bearer JWT (7-day sessions, mirrors web)
- Type: `Instrument Serif` (display) + `Inter` (body — closest Geist sibling on Google Fonts) + `JetBrains Mono` (labels) via `google_fonts`
- Markdown rendering via `flutter_markdown` for AI answers + recipe instructions

## User personas
1. **Janis-style power user** — keeps a personal board, dozens of items, daily capture from phone
2. **Casual capture** — opens app, dumps a thought into "Questions" or "Sparks", forgets about it
3. **Recipe planner** — uses the Meals panel + AI to expand ingredients/instructions

## Core requirements (static)
- Same domain model as web: user → many items (in named lists) → optional subtasks
- Same wire format: `GET /api/data` returns `{lists: {name: [items]}, tasks: [task]}`
- 14 panel types: questions, interests, tasks (+subtasks), reminders, keywords, shopping, notes, meals, bills, times, selling, motivations, learningGoals, habits (calendar omitted from MVP — uses generic simple list)
- AI buttons: define, answer, ingredients, instructions
- NO/EN i18n, light/dark theme
- 7-day JWT sessions persisted across launches

## What's implemented (May 25, 2026)
- ✅ Auth: register, login, logout, persistent JWT (`SharedPreferences`)
- ✅ Landing screen with sage halo, italic-accented hero, CTA buttons
- ✅ Auth screen (login ↔ register toggle, password show/hide, error states)
- ✅ Onboarding 4-step flow: welcome, pick boards (grid with check toggles), first spark (textarea + target list dropdown), ready summary
- ✅ Home board: paper canvas, scrollable panel feed, pull-to-refresh, "Add a board" bottom sheet, settings sheet (avatar, language, theme, sign out)
- ✅ All 14 panel renderers with full CRUD against the real API:
    - Simple list (interests, motivations, learningGoals, calendar)
    - Tasks with subtasks + checkbox states
    - Reminders with date pickers + overdue/today coloring
    - Questions with Anthropic AI answer + markdown rendering
    - Keywords with AI definitions + inline editor
    - Check-list (shopping, habits)
    - Notes (collapsible title + serif body)
    - Meals (tabs: ingredients with AI suggest, instructions with AI write + markdown preview)
    - Bills (amount + due date, overdue coloring)
    - Times (HH:MM + recurrence dropdown)
    - Selling (price + listed/pending/sold dropdown)
- ✅ AI button widget: spinner state, handles 503 (not configured), 429 'ai_budget_exceeded' (shows reset countdown), generic errors
- ✅ i18n: full EN + NO string tables matching web's i18n.js keys
- ✅ Theme: light + dark, full design-token parity with `public/style.css`
- ✅ Subscription-required state: friendly "open the web app to subscribe" screen with retry
- ✅ Android + iOS platform folders scaffolded, Dart code compiles cleanly (`flutter analyze` → 0 errors, 8 info-level hints)
- ✅ Smoke-tested via Flutter Web build — renders pixel-correct vs the web design

## What's NOT implemented (deliberate)
- ❌ Stripe paywall UI (user explicitly excluded; AI budget = soft demo limit instead). App handles 402 gracefully.
- ❌ Panel reorder / drag-resize (web has it; doesn't fit single-column mobile feed)
- ❌ Calendar view (web has it; substituted with simple list)
- ❌ Push notifications for reminders (server has no push infrastructure)
- ❌ Offline mode / local cache

## Backlog (P1 → P2)
- **P1** Add a server-side "mobile demo bypass" so non-subscribed users can taste the app
    - Easiest: `STRIPE_ENABLED=false` on the server, OR add a `requireActiveSubscriptionExceptMobile()` helper and detect a `X-MyBoard-Client: mobile` header
- **P1** Push notifications for reminders (FCM/APNs + a small `/api/devices/register` endpoint)
- **P2** Native-feeling drag-to-reorder for panels (Flutter `ReorderableListView`)
- **P2** Calendar view with dated agenda (uses existing `reminders` + `times` + `bills`)
- **P2** Offline-first: cache `GET /api/data` to disk, retry mutations on reconnect
- **P2** Biometric unlock (FaceID / fingerprint) after login

## How to run
```bash
cd /app/mobile
flutter pub get
flutter run             # connected device or emulator
flutter build apk --release   # Android sideload .apk
flutter build ios --release   # macOS + Xcode required
```
Override backend: `flutter run --dart-define=API_BASE=https://your.backend`

## Notes for future agents
- DON'T re-scaffold `android/` or `ios/` (already done with `--org com.myboard`)
- DON'T add Stripe — user explicitly excluded it
- DO call `integration_playbook_expert_v2` before swapping the AI provider
- The font substitutions (Inter for Geist, JetBrains Mono for Geist Mono) are deliberate — Geist isn't on Google Fonts yet. If/when google_fonts adds it, swap `inter`/`jetBrainsMono` → `geist`/`geistMono` in `lib/theme/mb_theme.dart`
