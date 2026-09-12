# TODO

## Done in v0.3.0 (from the user's six answers — see SPEC.md)
- [x] **Real home screen.** AURA is now a launcher: HOME + LAUNCHER intent filters,
      `RoleManager.ROLE_HOME` request flow, edge-to-edge insets, back handling.
- [x] **No Android Studio.** GitHub Actions workflow builds the APK
      (`src/android/github-workflow-build-apk.yml`, `BUILD-ONLINE.md`).
- [x] **Cut nothing.** All 7 widgets, 5 modes, 6 effects, 6 motion presets +
      custom keyframe studio, 6 themes kept.
- [x] **Android 15 + 13.** compileSdk/targetSdk 35, minSdk 24, version-gated branches.
- [x] **No sounds.** Zero audio code/assets.
- [x] **~100 MB.** 112-wallpaper JPEG pack (~91 MB) shipped as APK assets.
- [x] **Wallpapers = user photos.** Gallery picker (native, → `/cache/`), file upload
      (web), and pasted links from Pinterest/anywhere (super-fetch → stored locally,
      hotlink fallback).

## Before the next install, worth checking on the phone
- [ ] Does the first real `./gradlew assembleDebug` (or the Actions run) succeed? The
      Kotlin/Gradle/manifest were written blind — no SDK in the editor — so this is the
      one thing genuinely unverified.
- [ ] Does AURA appear in the Home-app chooser, and does the edge-to-edge layout clear
      the status bar and gesture bar on a real device?
- [ ] Do picked gallery photos look right at full lock/home size?

## Known limitations (honest list)
- The APK has **not** been compiled in this workspace — there is no Android SDK. The
  Kotlin, Gradle files and manifest are complete and were reviewed line by line, but
  the first real compile happens on GitHub Actions or a local SDK.
- **No live wallpaper** (`WallpaperService`). "Set as Android wallpaper" pushes a
  static frame to `WallpaperManager` (system/lock/both). An actual animated live
  wallpaper needs a `WallpaperService` + `Engine` and is not implemented.
- Widgets are **in-app** (drawn on AURA's own home screen), not Android
  `AppWidgetProvider`s, so third-party widgets can't live here yet.
- Widgets have fixed pixel widths (176–232 px), so on a 390 px-wide phone a column
  holds ~4 widgets before the layer reports "home is full". A smarter packer or
  narrower card variants would raise that.
- Weather needs geolocation + network; offline it shows a short reason instead of data.
- The **app drawer only works in the APK** — the browser/editor build shows an
  explanatory empty state (a web page cannot enumerate installed apps).
- Linked wallpapers are downloaded CORS-free (super-fetch on the web, the native
  HTTP client in the APK) and stored locally. If a host blocks the download *and*
  hotlinking, the image can't be shown at all.
- No sound, by request.

## On-device diagnostics (v0.3.1)
Because the APK is built in the cloud and installed on a phone, there is no debugger
to attach. The shell therefore catches its own failures and says so on screen:

- `AuraApp` sets a default `UncaughtExceptionHandler` that writes the stack trace to
  `filesDir/last-crash.txt` before the process dies. **Everything** (its source and
  the crash output) is public — see the security note in `AGENTS.md`-style terms: this
  is fine because it contains no secrets, only a stack trace.
- On the next launch, `MainActivity` finds that file and shows a scrollable
  **"AURA hit a problem"** screen (stack trace + device/Android summary + the tail of
  the page console log) with **Copy** and **Retry** buttons.
- The same screen is used for a caught failure in `onCreate`, a main-frame load error
  (`onReceivedError`), and a dead WebView renderer (`onRenderProcessGone`).
- **Silent (native) deaths:** a `session.lock` file is written while AURA is foregrounded
  and deleted in `onPause`. If it's still there at the next launch, the process vanished
  without a stack trace — the screen says so and offers **"Safe mode (GPU off)"**, a
  one-shot retry that sets `View.LAYER_TYPE_SOFTWARE` (hardware acceleration off) to
  rule out a bad GPU driver. It is never persistent, so a working safe-mode launch
  can't leave AURA degraded.
- JS `console.error`/`warn` output is appended to `filesDir/console.log` (capped at
  128 KB, reset each launch) and shown under `--- page console ---`.

Once the crash is understood, the auto-show can be narrowed (e.g. only show after a
crash that happened within the last N seconds, else hide the log behind a gesture).

## Ideas for depth / uniqueness
- [ ] A real `WallpaperService` live wallpaper (animate the shader behind the launcher).
- [ ] Per-widget "smart" behaviours (calendar/next-event, step counter, focus timer).
- [ ] Share/import individual widget layouts as short codes (extend `#aura=` links).
- [ ] Notification quick-settings tile for one-tap theme/effect switching.
- [ ] Export a PNG "poster" of the current layout.
- [ ] Wallpaper auto-rotation (daily/on-unlock) from the built-in pack or My photos.
