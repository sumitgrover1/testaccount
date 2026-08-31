package com.livetrack.app.location

import com.livetrack.app.KeyValueStore
import kotlinx.coroutines.flow.StateFlow

/** How much location access the user has granted. */
enum class LocationPermission {
    /** Not asked yet. */
    UNKNOWN,

    /** Explicitly refused, or blocked by device policy. */
    DENIED,

    /** Granted only while the app is on screen. */
    FOREGROUND_ONLY,

    /** Granted for background use as well ("Allow all the time" / "Always"). */
    BACKGROUND,
}

/**
 * Platform-backed location tracking. The Android implementation drives a
 * foreground service; the iOS implementation drives a `CLLocationManager`
 * configured for background updates. Both publish fixes into
 * [TrackingRepository].
 */
interface LocationTracker {
    val isTracking: StateFlow<Boolean>
    val permission: StateFlow<LocationPermission>

    /** Whether a further permission prompt can still upgrade access. */
    val canRequestMorePermission: Boolean

    /** Re-reads the current permission state, e.g. after returning from Settings. */
    fun refreshPermission()

    /** Shows the next permission prompt in the sequence, if there is one. */
    fun requestPermission()

    /** Begins location updates. No-op when permission has not been granted. */
    fun start()

    fun stop()
}

expect fun createLocationTracker(
    repository: TrackingRepository,
    store: KeyValueStore,
): LocationTracker
