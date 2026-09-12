# Building AURA locally (optional)

You do **not** need this — `BUILD-ONLINE.md` builds the APK on GitHub with no local
tooling. This page is here for completeness, for anyone who *does* have the Android
SDK (or wants to use Android Studio).

## Requirements

- JDK 17
- Android SDK with **platform 35** and **build-tools 35.0.0**
- Gradle is **not** required — the wrapper (`gradlew`) downloads Gradle 8.9 itself.

## Command line

The wallpapers are not stored in the repo, so fetch them first (they unzip to
`wallpapers/full/<id>.jpg` and `wallpapers/thumb/<id>.jpg`, and must land in `web/`):

```bash
cd web
for u in \
  https://user.uploads.dev/file/fca8cbb8db7a277a094194aad3e3657e.zip \
  https://user.uploads.dev/file/8889be41f5f51d8615fa0dc8f75cf64e.zip \
  https://user.uploads.dev/file/8404381b0c43e9311117aaf01464cced.zip \
  https://user.uploads.dev/file/c363c819ffde3464818a9212b99da41c.zip ; do
  curl -fsSL "$u" -o /tmp/wp.zip && unzip -oq /tmp/wp.zip
done
```

Then:

```bash
cd ../android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

Install it:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

or copy the APK to the phone and tap it (enable "Install unknown apps").

> Skip the wallpaper download and the build still works — it just produces a ~3 MB
> APK whose wallpaper picker shows flat colour swatches instead of photos.

## Android Studio

*Open* → select the `android/` folder → let it sync → Run ▶. Note the project is
nested inside the AURA source tree; if the IDE complains about path length, copy
`android/` and `web/` out together (they must stay siblings) and open the copy.

## Release build (signed)

The workflow and the commands above produce a **debug** APK. For a signed release,
add a `signingConfigs` block to `android/app/build.gradle` pointing at a keystore, set
`buildTypes.release.signingConfig`, and run `./gradlew assembleRelease`.

## Version bumps

Edit `android/app/build.gradle`:

```gradle
versionCode 4          // integer, must increase
versionName "0.3.1"    // shown to the user
```

…and keep `src/web/config.js` (`APP.version`) and `main.pjs` (`getAppConfig().version`)
in step.
