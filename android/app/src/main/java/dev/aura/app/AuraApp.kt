package dev.aura.app

import android.app.Application
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

/**
 * Records any uncaught exception to `filesDir/last-crash.txt` before letting the
 * process die. [MainActivity] reads that file on the next launch and shows it in
 * the diagnostics screen, which is the only way to see a crash reason on a phone
 * that isn't attached to a debugger.
 */
class AuraApp : Application() {

    override fun onCreate() {
        super.onCreate()
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            runCatching {
                val sw = StringWriter()
                error.printStackTrace(PrintWriter(sw))
                File(filesDir, "last-crash.txt").writeText(
                    "AURA crashed\n\n$sw\n--- device ---\n" +
                        "android ${android.os.Build.VERSION.RELEASE} (sdk ${android.os.Build.VERSION.SDK_INT})\n" +
                        "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}\n"
                )
            }
            previous?.uncaughtException(thread, error)
        }
    }
}
