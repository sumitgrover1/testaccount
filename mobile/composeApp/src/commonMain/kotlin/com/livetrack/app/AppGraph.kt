package com.livetrack.app

import com.livetrack.app.auth.AuthRepository
import com.livetrack.app.location.LocationTracker
import com.livetrack.app.location.TrackingRepository
import com.livetrack.app.location.createLocationTracker

/**
 * Process-wide singletons. Deliberately tiny — the Android foreground service
 * and the Compose UI both reach the same [tracking] instance through here, so
 * fixes collected in the background show up in the UI without any plumbing.
 *
 * On Android this must not be touched before `LiveTrackApplication.onCreate`.
 */
object AppGraph {
    val store: KeyValueStore by lazy { createKeyValueStore() }
    val auth: AuthRepository by lazy { AuthRepository(store) }
    val tracking: TrackingRepository by lazy { TrackingRepository(store) }
    val tracker: LocationTracker by lazy { createLocationTracker(tracking, store) }
}
