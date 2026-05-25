# MyBoard — Flutter (iOS + Android)

A native multiplatform mobile client for [MyBoard](https://myboard.org). One board for everything on your mind — questions, sparks, tasks, notes, reminders, and more. All data syncs with the existing MyBoard backend at `https://myboard.org`.

## What's inside

- **Auth** — register / login / 7-day JWT sessions
- **Onboarding** — 4-step setup, pick which boards you want
- **Home board** — 14 panel types: questions, interests, tasks (+ subtasks), reminders, keywords, shopping, notes, meals, bills, times, selling, motivations, learning goals, habits, simple lists
- **AI buttons** — Claude Haiku 4.5 for define / answer / recipe ingredients & instructions, with the server-side €4/month soft demo budget surfaced as a quota chip
- **i18n** — Norwegian 🇳🇴 / English 🇬🇧 switcher
- **Light + dark theme** — paper + sage accent, matches the web design (Instrument Serif for headlines; Inter ≈ Geist for body and JetBrains Mono ≈ Geist Mono for labels, since Geist isn't yet on Google Fonts — both substitutes are extremely close and rendered live via `google_fonts`)

## Requirements

- Flutter SDK **3.19+** (`flutter --version`)
- For Android builds: Android Studio + an SDK / emulator (or a real phone in USB-debug)
- For iOS builds: macOS + Xcode + CocoaPods + an iOS simulator (or real device)

If you don't have Flutter installed yet:
https://docs.flutter.dev/get-started/install

## Quick start

```bash
cd mobile

# 1) scaffold the platform folders (android/, ios/) into this project
flutter create --platforms=android,ios --org com.myboard --project-name myboard .

# 2) install dependencies
flutter pub get

# 3) run on a connected device / emulator
flutter run
```

## Build a release APK (Android)

```bash
flutter build apk --release
# output: build/app/outputs/flutter-apk/app-release.apk
```

Sideload that file onto any Android phone.

## Build for iOS

```bash
# must be on macOS with Xcode installed
flutter build ios --release
# then open ios/Runner.xcworkspace in Xcode and Archive
```

## Pointing the app at a different backend

Default API host is `https://myboard.org`. Override at build time:

```bash
flutter run --dart-define=API_BASE=https://your-backend.com
flutter build apk --release --dart-define=API_BASE=https://your-backend.com
```

## Project structure

```
lib/
├── main.dart                   # app entry + routing
├── theme/mb_theme.dart         # MyBoard design tokens (paper / sage / coral)
├── api/client.dart             # HTTP client + auth + all endpoints
├── i18n/strings.dart           # NO / EN translations
├── models/board_models.dart    # Item, Task, Subtask, BoardData
├── state/app_state.dart        # ChangeNotifier app state
├── panels/panel_registry.dart  # the 14 panel definitions
├── widgets/                    # wordmark, buttons, inputs, ai button, panel shell
└── screens/
    ├── landing_screen.dart
    ├── auth_screen.dart        # login + register (toggled)
    ├── onboarding_screen.dart  # 4-step setup
    ├── home_screen.dart        # the board
    └── panel_screens/          # 14 panel renderers
```

## Notes

- The Stripe paywall from the web app is **not** mirrored in mobile (your call). The app uses the existing **AI budget** (`AI_BUDGET_EUR_PER_MONTH`, default €4 / user / month) as a soft demo limit — when exhausted, the AI buttons surface a "demo limit reached, resets in N days" message and the rest of the app keeps working.
- The data model is identical to the web: same `/api/data` payload shape, same panel ids, same item rows.
- Built against the live API at https://myboard.org. Verified endpoints: `/api/register`, `/api/login`, `/api/billing/status`, `/api/data`, `/api/data/:listName`, `/api/data/item/:id`, `/api/tasks`, `/api/tasks/:taskId/subtasks`, `/api/subtasks/:id`, `/api/ai`.
