# Building AURA's APK without Android Studio

You do **not** need Android Studio, the Android SDK, or a powerful computer. GitHub
builds the APK for you in the cloud and hands you back a file. You can even do all of
this from the phone itself.

Everything you need is in `aura-apk-project.zip`. It looks like this:

```
aura/
  android/                 the Gradle project
  web/                     the AURA web app (the actual UI)
  .github/workflows/build-apk.yml
  README.md  SPEC.md  BUILD.md  BUILD-ONLINE.md
```

`android/` and `web/` must stay as **siblings** — `android/app/build.gradle` points at
`../../web`. Don't rename or move them.

---

## The whole process

### 1. Make a GitHub account
Free, at <https://github.com/signup>. Skip if you have one.

### 2. Create an empty repository
- Go to <https://github.com/new>.
- Name it `aura` (or anything). **Public** is fine — it costs nothing and Actions
  minutes are unlimited for public repos. (Private also works; you get 2,000 free
  build-minutes a month and this build takes ~3–5.)
- Do **not** tick "Add a README".
- Create it.

### 3. Unzip `aura-apk-project.zip`
On a computer: double-click it. On a phone: use any file-manager that can unzip
(e.g. Files by Google → long-press → Extract).

You'll get a folder called `aura`.

### 4. Upload the contents to your repo
Easiest path, no git knowledge needed:

- On your new repo's page click **uploading an existing file**
  (<https://github.com/<you>/aura/upload>).
- Drag in **everything inside** the `aura` folder — i.e. the `android` folder, the
  `web` folder, and the loose files. (GitHub's web uploader keeps folder structure,
  but it does **not** accept a dragged *top-level* folder by itself in some browsers,
  so open `aura` first and select its contents.)
- Commit.

> The `.github/workflows/build-apk.yml` file must end up at `.github/workflows/build-apk.yml`
> in the repo. GitHub's web uploader drops dot-folders. If it's missing after upload,
> recreate it: **Add file → Create new file**, type
> `.github/workflows/build-apk.yml` as the name, and paste the contents of
> `android/github-workflow-build-apk.yml`.

Using `git` instead? From inside the `aura` folder:

```bash
git init
git add -A
git commit -m "AURA"
git branch -M main
git remote add origin https://github.com/<you>/aura.git
git push -u origin main
```

### 5. Watch the build
Open your repo's **Actions** tab. A run named **Build APK** starts automatically.
It takes about 3–5 minutes: it downloads the 112 wallpapers (~91 MB), installs the
Android SDK, and runs Gradle.

A green tick means success. A red cross means the build failed — open the run and read
the last ~40 lines; the error will name the file and line.

### 6. Download the APK
On the finished run's page, scroll to **Artifacts** and tap **aura-debug-apk**. GitHub
gives you a `.zip` containing `app-debug.apk` — unzip it on the phone.

### 7. Install it
- Tap the `.apk`. Android will say installing apps from this source is blocked.
- Choose **Settings → allow from this source**, come back, tap the APK again.
- Install. (Debug APKs aren't from the Play Store, so this "unknown apps" prompt is
  expected and normal.)

### 8. Make it your home screen
Open AURA once (it opens like a normal app). Then either:
- AURA's own **Settings → Set as home app** button, which opens the system chooser, or
- Android **Settings → Apps → Default apps → Home app → AURA**.

Press the home gesture and AURA is now your launcher.

---

## If it crashes when you open it

From version **0.3.1** the app has a built-in crash screen. If AURA dies, the next
time you open it you'll see **"AURA hit a problem"** with the exact reason (a stack
trace, your device/Android version, and the last few JavaScript errors) plus
**Copy** and **Retry** buttons.

- Tap **Copy** (or screenshot the screen) and send that text on — it says precisely
  what went wrong and where.
- **Retry** clears the log and starts the app normally again.
- If the text says AURA "closed without reporting an error", that means the process
  died natively (usually the graphics driver). Tap **Safe mode (GPU off)** to retry
  with hardware acceleration switched off for that one launch.
- If it isn't crashing, you never see this screen.

If the app closes with *no* crash screen at all, that means the whole process died
natively (usually the graphics driver). Say so — that's a different, narrower problem.

---

## Updating later

Push any change to the repo and a new APK builds automatically — same download steps.
Bump `versionCode` / `versionName` in `android/app/build.gradle` if you want Android to
treat it as a new version rather than an update of the old one.

## Notes / limits

- The APK is **debug-signed**. That is fine for personal installs. If you ever want the
  Play Store, you'd add a release keystore — ask and it can be set up.
- Android blocks installing a debug APK **over** one installed from the Play Store (and
  vice-versa) unless you uninstall the other first.
- The build never runs on your laptop, so how weak it is doesn't matter.
- Targeting **Android 13 and 15** (minSdk 24, compileSdk/targetSdk 35), so it runs on
  basically any modern phone.
