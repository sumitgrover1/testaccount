package com.livetrack.app

import android.app.Application
import android.content.Context

/**
 * Holds the application context so common code can reach platform services
 * without threading a `Context` through every constructor.
 */
object AndroidApp {
    private var applicationContext: Context? = null

    fun install(context: Context) {
        applicationContext = context.applicationContext
    }

    fun context(): Context = requireNotNull(applicationContext) {
        "AndroidApp.install() was not called - is LiveTrackApplication registered in the manifest?"
    }
}

class LiveTrackApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AndroidApp.install(this)
    }
}
