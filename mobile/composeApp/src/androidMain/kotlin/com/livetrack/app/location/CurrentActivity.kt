package com.livetrack.app.location

import android.app.Activity
import java.lang.ref.WeakReference

/**
 * The activity currently on screen, used only to raise permission dialogs.
 * Held weakly so a destroyed activity can still be collected.
 */
object CurrentActivity {
    private var reference: WeakReference<Activity>? = null

    fun set(activity: Activity) {
        reference = WeakReference(activity)
    }

    fun clear(activity: Activity) {
        if (reference?.get() === activity) reference = null
    }

    fun get(): Activity? = reference?.get()?.takeIf { !it.isFinishing }
}
