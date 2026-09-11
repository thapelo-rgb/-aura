# SPEC — what the user asked for

## Original request (verbatim intent preserved, not paraphrased away)

- "create a application that can be transferred via usb as an apk"
  → deliverable must be installable on a phone from a USB copy, i.e. a real APK
  project, not just a web page.
- "it allows phone customisation like widgets, animations and little effects
  similar to goodlock except this one is for any android phone"
  → widgets + animations + effects, Good-Lock-like, **not** Samsung-only; must
  not depend on One UI APIs.
- "if animations are not compatible it should offer either depth or the effects"
  → graceful degradation chain: full → depth → effects → static, with a visible
  capability panel explaining why. Implemented in `capabilities.js` +
  `app.js:applyMode()`.
- "make custom ability nice and unique even have aesthetically pleasing or
  minimal"
  → the custom-motion keyframe studio is the signature feature; visuals use a
  minimal dark glassmorphism style (`aura.css`).
- "ask me question before i try it on my phone cause i wanna se what to add or fix"
  → do not assume the feature list is final; present the build, the test results,
  and open questions before the user installs it.

## The six questions — and the user's answers (v0.3.0)

The six open questions from v0.2.0 were put to the user. Answers, verbatim:

> okay 1. real home screen 2. no android studio due to my laptop being rather weak
> 3. cut nothing 4. android 15 and 13 5.no sounds and make it around 100mb
> 6. when i meant wallpaper i meant as in the ones anyone wants to add thats
> either from gallery or pintrest

Decoded into requirements:

1. **Real home screen.** AURA must be a launcher, not just an in-app home screen.
   → Two intent filters (LAUNCHER + HOME/DEFAULT), role-request flow, edge-to-edge
   insets, back-gesture handling, and an in-page app drawer that lists/launches
   installed apps.
2. **No Android Studio** — the user's laptop is weak.
   → The build runs in GitHub Actions. Nothing compiles locally. See
   `src/android/BUILD-ONLINE.md` and `src/android/github-workflow-build-apk.yml`.
   Android Studio remains *possible* but is not needed.
3. **Cut nothing.**
   → All 7 widgets (clock/battery/weather/quote/notes/motion/insight), all 5
   fallback modes, 6 effects, 6 motion presets + the custom keyframe studio, 6
   themes and 5 nav destinations are kept. Nothing was removed to make room for
   the launcher work.
4. **Android 15 and 13.**
   → `minSdk 24`, `compileSdk 35`, `targetSdk 35`; version-gated branches for
   API 24/26/28/29/30/33/34 (`queryIntentActivities` flags, `RoleManager`,
   `VibratorManager`, `PickMultipleVisualMedia`, edge-to-edge, predictive back).
5. **No sounds; ~100 MB.**
   → Zero audio code and zero audio assets anywhere. The APK reaches ~100 MB by
   shipping the 112-wallpaper JPEG pack (~91 MB; `src/android/WALLPAPERS.md`).
   Deliberately *content*, not padding.
6. **"Wallpaper" means user-added images** — from the **gallery** or **Pinterest**,
   not only the built-in styles.
   → `#view-wallpaper` has three panes: **Built-in** (112 procedural looks),
   **My photos** (native gallery picker → `/cache/` JPEGs, or file upload in the
   web build), and **Link** (paste any Pinterest/remote image URL; fetched
   CORS-free — super-fetch in the web build, the native HTTP client in the APK —
   and stored in IndexedDB so it works offline). Wallpapers can also be pushed to
   Android's own wallpaper manager.

## Non-negotiables

- One source of truth: `src/web/` is the app for **both** the Perchance page and
  the APK. Never fork the UI.
- The graceful-degradation chain must stay intact — a device that cannot animate
  still gets a working home screen.
- No secrets in the repo or the generator source.
- Nothing is published/renamed without the user explicitly asking.
