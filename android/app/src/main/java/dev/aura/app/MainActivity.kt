package dev.aura.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.WallpaperManager
import android.app.role.RoleManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.OpenableColumns
import android.provider.Settings
import android.util.Base64
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * AURA's native shell.
 *
 * The whole UI is HTML/CSS/JS held in the APK's assets (see ../web), served through
 * [WebViewAssetLoader] so it has a real `https://` origin. That origin is what makes
 * ES modules, WebGL, IndexedDB and the sensor APIs behave exactly as they do on the
 * web; a `file:///android_asset/...` load would break all of them.
 *
 * The shell adds the handful of things a web page cannot do on its own:
 *   * becoming the HOME app,
 *   * listing and launching installed apps (with icons),
 *   * handing the current wallpaper to Android's wallpaper manager,
 *   * opening the system photo picker,
 *   * and reporting real window insets (env() inside a WebView is unreliable).
 *
 * All of that goes through one Java bridge method, [Bridge.invoke], which answers
 * asynchronously via `window.__auraNativeResult(id, json)` (see src/web/native.js).
 */
class MainActivity : ComponentActivity() {

    private lateinit var web: WebView
    private lateinit var loader: WebViewAssetLoader
    private val io = Executors.newCachedThreadPool()
    private val iconCache = java.util.concurrent.ConcurrentHashMap<String, String>()

    // Held while the runtime location prompt is on screen.
    private var pendingGeo: GeolocationPermissions.Callback? = null
    private var pendingGeoOrigin: String? = null

    // Held while the photo picker is on screen.
    private var pendingPickId = 0

    // Last insets we measured, replayed once the page finishes loading.
    private var insetTop = 0f
    private var insetBottom = 0f
    private var insetLeft = 0f
    private var insetRight = 0f

    private val locationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            pendingGeo?.invoke(pendingGeoOrigin, granted, false)
            pendingGeo = null
            pendingGeoOrigin = null
            if (!granted) pushEvent("geodenied", null)
        }

    private val pickImages =
        registerForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(12)) { uris ->
            onPicked(uris)
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Edge to edge: the app draws under the status/nav bars and receives the
        // insets over the bridge, so its own chrome can sit clear of them.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }
        @Suppress("DEPRECATION")
        window.statusBarColor = Color.TRANSPARENT
        @Suppress("DEPRECATION")
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isStatusBarContrastEnforced = false
            window.isNavigationBarContrastEnforced = false
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        // Web assets live at /assets/, and picked photos are parked in /cache/ so
        // the page can fetch them by URL instead of dragging base64 over the bridge.
        loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/cache/", WebViewAssetLoader.InternalStoragePathHandler(this, cacheDir))
            .build()

        web = WebView(this)
        web.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        )
        web.setBackgroundColor(Color.parseColor("#FF05060A"))
        web.overScrollMode = View.OVER_SCROLL_NEVER
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = false
            allowContentAccess = false
            useWideViewPort = true
            loadWithOverviewMode = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            web.settings.safeBrowsingEnabled = false
        }
        web.addJavascriptInterface(Bridge(), "AuraNative")

        if ((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView, request: WebResourceRequest
            ): WebResourceResponse? = loader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView, request: WebResourceRequest
            ): Boolean {
                val url = request.url
                if (url.host == "appassets.androidplatform.net") return false
                return openExternally(url)
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                pushInsets()
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                request.grant(request.resources)
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?, callback: GeolocationPermissions.Callback?
            ) {
                if (origin == null || callback == null) return
                val fine = ContextCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                if (fine) {
                    callback.invoke(origin, true, false)
                } else {
                    pendingGeo = callback
                    pendingGeoOrigin = origin
                    locationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                }
            }
        }

        ViewCompat.setOnApplyWindowInsetsListener(web) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val d = resources.displayMetrics.density
            insetTop = bars.top / d
            insetBottom = bars.bottom / d
            insetLeft = bars.left / d
            insetRight = bars.right / d
            pushInsets()
            insets
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Give the page first refusal: it uses back to close the settings
                // sheet, then to leave a sub-view. Only if it declines do we act.
                web.evaluateJavascript(BACK_PROBE) { value ->
                    if (value != null && value.trim().trim('"') == "1") return@evaluateJavascript
                    if (web.canGoBack()) {
                        web.goBack()
                    } else if (isDefaultHome()) {
                        moveTaskToBack(true)
                    } else {
                        finish()
                    }
                }
            }
        })

        io.execute {
            // Picker files and downloaded links are scratch; clear leftovers.
            runCatching {
                cacheDir.listFiles { f ->
                    f.name.startsWith("pick-") || f.name.startsWith("link-")
                }?.forEach { it.delete() }
            }
        }

        web.loadUrl(HOME_URL)
        web.requestApplyInsets()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // Started again from the home gesture / app icon: bounce the UI home.
        pushEvent("home", null)
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        pushEvent("resume", null)
    }

    override fun onPause() {
        super.onPause()
        web.onPause()
    }

    override fun onDestroy() {
        io.shutdownNow()
        super.onDestroy()
    }

    /* ------------------------------------------------------------------ *
     *  Bridge                                                            *
     * ------------------------------------------------------------------ */

    inner class Bridge {
        @JavascriptInterface
        fun invoke(payload: String) {
            val obj = try {
                JSONObject(payload)
            } catch (e: Exception) {
                return
            }
            val id = obj.optInt("id", 0)
            val method = obj.optString("method", "")
            val args = obj.optJSONObject("args") ?: JSONObject()
            try {
                handle(id, method, args)
            } catch (e: Exception) {
                respond(id, err(e.message ?: "native-error"))
            }
        }

        @JavascriptInterface
        fun platform(): String = "android"

        @JavascriptInterface
        fun version(): String = Build.VERSION.RELEASE ?: ""
    }

    private fun handle(id: Int, method: String, args: JSONObject) {
        when (method) {
            "info" -> respond(id, ok(infoJson()))
            "vibrate" -> {
                vibrate(args.optLong("ms", 12))
                respond(id, ok(null))
            }
            "apps" -> io.execute { respond(id, runCatching { ok(appsJson()) }.getOrElse { err("apps-failed") }) }
            "icon" -> {
                val pkg = str(args, "pkg")
                io.execute { respond(id, ok(iconDataUrl(pkg))) }
            }
            "launch" -> respond(id, launchApp(str(args, "pkg"), str(args, "cls").ifEmpty { null }))
            "openAppInfo" -> respond(id, openAppInfo(str(args, "pkg")))
            "isDefaultHome" -> respond(id, ok(isDefaultHome()))
            "openHomeSettings" -> respond(id, openHomeSettings())
            "pickImage" -> {
                pendingPickId = id
                runOnUiThread {
                    try {
                        pickImages.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                        )
                    } catch (e: ActivityNotFoundException) {
                        pendingPickId = 0
                        respond(id, err("no-picker"))
                    }
                }
            }
            "fetchImage" -> io.execute {
                respond(
                    id,
                    runCatching { fetchImage(str(args, "url")) }.getOrElse { err("fetch-failed") }
                )
            }
            "setWallpaper" -> {
                val dataUrl = str(args, "dataUrl")
                val target = str(args, "target").ifEmpty { "home" }
                io.execute { respond(id, runCatching { setWallpaper(dataUrl, target) }.getOrElse { err("set-failed") }) }
            }
            "exit" -> {
                respond(id, ok(null))
                runOnUiThread { moveTaskToBack(true) }
            }
            else -> respond(id, err("unknown-method"))
        }
    }

    private fun infoJson(): JSONObject {
        val dm = resources.displayMetrics
        return JSONObject()
            .put("platform", "android")
            .put("sdk", Build.VERSION.SDK_INT)
            .put("release", Build.VERSION.RELEASE)
            .put("model", Build.MODEL)
            .put("manufacturer", Build.MANUFACTURER)
            .put("width", dm.widthPixels)
            .put("height", dm.heightPixels)
            .put("density", dm.density.toDouble())
            .put("isDefaultHome", isDefaultHome())
    }

    private fun appsJson(): JSONArray {
        val pm = packageManager
        val intent = Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER)
        val found = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
        } else {
            @Suppress("DEPRECATION")
            pm.queryIntentActivities(intent, 0)
        }
        val arr = JSONArray()
        val seen = HashSet<String>()
        for (ri in found) {
            val ai = ri.activityInfo ?: continue
            val pkg = ai.packageName ?: continue
            if (pkg == packageName) continue
            val key = "$pkg/${ai.name}"
            if (!seen.add(key)) continue
            val label = runCatching { ai.loadLabel(pm).toString() }.getOrDefault(pkg)
            arr.put(
                JSONObject()
                    .put("pkg", pkg)
                    .put("cls", ai.name)
                    .put("label", label)
            )
        }
        return arr
    }

    private fun iconDataUrl(pkg: String): String {
        iconCache[pkg]?.let { return it }
        val drawable = runCatching { packageManager.getApplicationIcon(pkg) }.getOrNull() ?: return ""
        val bmp = drawableToBitmap(drawable, 144)
        val baos = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, baos)
        bmp.recycle()
        val url = "data:image/png;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
        iconCache[pkg] = url
        return url
    }

    private fun drawableToBitmap(d: Drawable, size: Int): Bitmap {
        if (d is BitmapDrawable) {
            val src = d.bitmap
            if (src != null && src.width >= size && src.height >= size) {
                return Bitmap.createScaledBitmap(src, size, size, true)
            }
        }
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        d.setBounds(0, 0, size, size)
        d.draw(canvas)
        return bmp
    }

    private fun launchApp(pkg: String, cls: String?): JSONObject {
        if (pkg.isEmpty()) return err("bad-package")
        return runCatching {
            val intent = if (cls != null) {
                Intent().setComponent(ComponentName(pkg, cls))
            } else {
                packageManager.getLaunchIntentForPackage(pkg)
            }
            if (intent == null) return err("not-found")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
            ok(null)
        }.getOrElse { err("launch-failed") }
    }

    private fun openAppInfo(pkg: String): JSONObject {
        if (pkg.isEmpty()) return err("bad-package")
        return runCatching {
            val intent = Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.fromParts("package", pkg, null)
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
            ok(null)
        }.getOrElse { err("settings-failed") }
    }

    private fun isDefaultHome(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val rm = getSystemService(RoleManager::class.java)
            rm != null && rm.isRoleHeld(RoleManager.ROLE_HOME)
        } else {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            @Suppress("DEPRECATION")
            val res = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
            res?.activityInfo?.packageName == packageName
        }
    }

    private fun openHomeSettings(): JSONObject {
        return runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val rm = getSystemService(RoleManager::class.java)
                if (rm != null && rm.isRoleAvailable(RoleManager.ROLE_HOME)) {
                    startActivity(rm.createRequestRoleIntent(RoleManager.ROLE_HOME))
                    return ok(null)
                }
            }
            startActivity(Intent(Settings.ACTION_HOME_SETTINGS))
            ok(null)
        }.getOrElse { err("settings-failed") }
    }

    private fun setWallpaper(dataUrl: String, target: String): JSONObject {
        val comma = dataUrl.indexOf(',')
        if (comma < 0) return err("bad-image")
        val bytes = runCatching { Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT) }
            .getOrNull() ?: return err("bad-image")
        val bmp = runCatching { BitmapFactory.decodeByteArray(bytes, 0, bytes.size) }
            .getOrNull() ?: return err("bad-image")
        return runCatching {
            val wm = WallpaperManager.getInstance(this)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val flags = when (target) {
                    "lock" -> WallpaperManager.FLAG_LOCK
                    "both" -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
                    else -> WallpaperManager.FLAG_SYSTEM
                }
                wm.setBitmap(bmp, null, true, flags)
            } else {
                @Suppress("DEPRECATION")
                wm.setBitmap(bmp)
            }
            bmp.recycle()
            ok(null)
        }.getOrElse { err("set-failed") }
    }

    /**
     * Download an image by URL. A WebView `fetch` is subject to CORS, which most
     * image hosts (Pinterest included) don't grant — but Java's HTTP stack is not,
     * so pasted links still work inside the APK. The bytes land in /cache/ and are
     * handed back as a same-origin URL the page can read.
     */
    private fun fetchImage(url: String): JSONObject {
        if (!url.startsWith("http://") && !url.startsWith("https://")) return err("bad-url")
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 20000
            instanceFollowRedirects = true
            requestMethod = "GET"
            setRequestProperty("User-Agent", USER_AGENT)
            setRequestProperty("Accept", "image/*,*/*;q=0.8")
        }
        return try {
            val code = conn.responseCode
            if (code !in 200..299) return err("http-$code")
            val type = conn.contentType ?: ""
            if (!type.startsWith("image/")) return err("not-image")
            val ext = when {
                type.contains("png") -> "png"
                type.contains("webp") -> "webp"
                type.contains("gif") -> "gif"
                else -> "jpg"
            }
            val file = File(cacheDir, "link-${System.currentTimeMillis()}.$ext")
            var total = 0L
            conn.inputStream.use { input ->
                FileOutputStream(file).use { out ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        total += n
                        if (total > MAX_IMAGE_BYTES) {
                            out.flush()
                            out.close()
                            file.delete()
                            return err("too-big")
                        }
                        out.write(buf, 0, n)
                    }
                }
            }
            if (total == 0L) {
                file.delete()
                return err("empty")
            }
            ok(
                JSONObject()
                    .put("name", nameFromUrl(url))
                    .put("url", CACHE_URL + file.name)
                    .put("type", type)
            )
        } catch (e: Exception) {
            err("fetch-failed")
        } finally {
            conn.disconnect()
        }
    }

    private fun nameFromUrl(url: String): String {
        val raw = url.substringBefore('#').substringBefore('?').trimEnd('/')
        val last = raw.substringAfterLast('/').ifEmpty { "" }
        val decoded = runCatching { Uri.decode(last) }.getOrDefault(last)
        return decoded.ifEmpty { "Linked image" }
    }

    /* ------------------------------------------------------------------ *
     *  Photo picker                                                      *
     * ------------------------------------------------------------------ */

    private fun onPicked(uris: List<Uri>) {
        val id = pendingPickId
        pendingPickId = 0
        if (id <= 0) return
        io.execute {
            val arr = JSONArray()
            var n = 0
            for (uri in uris) {
                try {
                    val bmp = decodeScaled(uri, 2048) ?: continue
                    val file = File(cacheDir, "pick-${System.currentTimeMillis()}-${n}.jpg")
                    FileOutputStream(file).use { out ->
                        bmp.compress(Bitmap.CompressFormat.JPEG, 88, out)
                    }
                    bmp.recycle()
                    n++
                    arr.put(
                        JSONObject()
                            .put("name", queryName(uri))
                            .put("url", CACHE_URL + file.name)
                    )
                } catch (e: Exception) {
                    // One unreadable pick must not lose the rest of the batch.
                }
            }
            respond(id, ok(arr))
        }
    }

    private fun decodeScaled(uri: Uri, maxEdge: Int): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        val longest = maxOf(bounds.outWidth, bounds.outHeight)
        while (longest / sample > maxEdge) sample *= 2
        val opts = BitmapFactory.Options().apply {
            inSampleSize = sample
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        return contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
    }

    private fun queryName(uri: Uri): String {
        var name = "Photo"
        runCatching {
            contentResolver.query(uri, null, null, null, null)?.use { c ->
                val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0 && c.moveToFirst()) name = c.getString(idx) ?: name
            }
        }
        return name
    }

    /* ------------------------------------------------------------------ *
     *  Plumbing                                                          *
     * ------------------------------------------------------------------ */

    /** Reads a string arg, treating JSON `null` (which org.json renders as "null") as absent. */
    private fun str(args: JSONObject, name: String): String {
        val v = args.optString(name, "")
        return if (v == "null") "" else v
    }

    private fun ok(value: Any?): JSONObject {
        val o = JSONObject().put("ok", true)
        if (value != null) o.put("value", value)
        return o
    }

    private fun err(message: String): JSONObject =
        JSONObject().put("ok", false).put("error", message)

    private fun respond(id: Int, obj: JSONObject) {
        if (id <= 0) return
        val js = "window.__auraNativeResult($id, ${JSONObject.quote(obj.toString())});"
        web.post { web.evaluateJavascript(js, null) }
    }

    private fun pushEvent(name: String, data: JSONObject?) {
        val payload = data?.toString() ?: "null"
        val js = "window.__auraNativeEvent&&window.__auraNativeEvent(" +
            "${JSONObject.quote(name)}, ${JSONObject.quote(payload)});"
        web.post { web.evaluateJavascript(js, null) }
    }

    private fun pushInsets() {
        val js = "window.AURA&&window.AURA.setInsets&&window.AURA.setInsets({" +
            "top:$insetTop,bottom:$insetBottom,left:$insetLeft,right:$insetRight});"
        web.post { web.evaluateJavascript(js, null) }
    }

    private fun vibrate(ms: Long) {
        runCatching {
            val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            } ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(ms)
            }
        }
    }

    private fun openExternally(url: Uri): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, url))
            true
        } catch (e: Exception) {
            false
        }
    }

    companion object {
        private const val HOME_URL =
            "https://appassets.androidplatform.net/assets/index.html"
        private const val CACHE_URL =
            "https://appassets.androidplatform.net/cache/"

        /** Some image hosts (Pinterest among them) reject requests without a UA. */
        private const val USER_AGENT =
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/126.0.0.0 Mobile Safari/537.36"

        /** Refuse absurd downloads — a wallpaper is nowhere near this big. */
        private const val MAX_IMAGE_BYTES = 24L * 1024 * 1024

        /** Lets the web app swallow the back gesture (close a sheet) before we exit. */
        private const val BACK_PROBE = "(function(){try{" +
            "return (window.AURA&&window.AURA.handleBack&&window.AURA.handleBack())?1:0;" +
            "}catch(e){}return 0;})()"
    }
}
