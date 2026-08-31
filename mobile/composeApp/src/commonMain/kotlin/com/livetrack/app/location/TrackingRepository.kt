package com.livetrack.app.location

import com.livetrack.app.KeyValueStore
import com.livetrack.app.getDouble
import com.livetrack.app.getLong
import com.livetrack.app.putDouble
import com.livetrack.app.putLong
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Single source of truth for collected location fixes. Both the UI and the
 * platform trackers talk to one shared instance, so fixes recorded while the
 * app is in the background are already here when the UI comes back.
 *
 * The full trail is kept in memory (bounded by [MAX_TRAIL_POINTS]); the
 * summary — last fix, point count, distance — is persisted so it survives the
 * process being killed.
 */
class TrackingRepository(private val store: KeyValueStore) {

    private val _lastPoint = MutableStateFlow<GeoPoint?>(null)
    val lastPoint: StateFlow<GeoPoint?> = _lastPoint.asStateFlow()

    private val _trail = MutableStateFlow<List<GeoPoint>>(emptyList())
    val trail: StateFlow<List<GeoPoint>> = _trail.asStateFlow()

    private val _pointCount = MutableStateFlow(0)
    val pointCount: StateFlow<Int> = _pointCount.asStateFlow()

    private val _distanceMeters = MutableStateFlow(0.0)
    val distanceMeters: StateFlow<Double> = _distanceMeters.asStateFlow()

    init {
        restore()
    }

    /** Records a fix. Called from the platform location callbacks. */
    fun publish(point: GeoPoint) {
        val previous = _lastPoint.value
        if (previous != null) {
            val step = distanceMetersBetween(previous, point)
            // Ignore sub-metre jitter so a stationary device does not accumulate
            // phantom distance.
            if (step >= 1.0) {
                _distanceMeters.value += step
            }
        }

        _lastPoint.value = point
        _pointCount.value += 1
        _trail.value = (_trail.value + point).takeLast(MAX_TRAIL_POINTS)
        persist(point)
    }

    /** Clears the recorded trail and summary, keeping the last known fix. */
    fun clearTrail() {
        _trail.value = _lastPoint.value?.let { listOf(it) } ?: emptyList()
        _pointCount.value = 0
        _distanceMeters.value = 0.0
        store.putLong(KEY_COUNT, 0L)
        store.putDouble(KEY_DISTANCE, 0.0)
    }

    private fun persist(point: GeoPoint) {
        store.putDouble(KEY_LAT, point.latitude)
        store.putDouble(KEY_LON, point.longitude)
        store.putDouble(KEY_ACCURACY, point.accuracyMeters)
        store.putLong(KEY_TIMESTAMP, point.timestampMillis)
        store.putLong(KEY_COUNT, _pointCount.value.toLong())
        store.putDouble(KEY_DISTANCE, _distanceMeters.value)
    }

    private fun restore() {
        _pointCount.value = (store.getLong(KEY_COUNT) ?: 0L).toInt()
        _distanceMeters.value = store.getDouble(KEY_DISTANCE) ?: 0.0

        val latitude = store.getDouble(KEY_LAT) ?: return
        val longitude = store.getDouble(KEY_LON) ?: return
        val timestamp = store.getLong(KEY_TIMESTAMP) ?: return

        val point = GeoPoint(
            latitude = latitude,
            longitude = longitude,
            accuracyMeters = store.getDouble(KEY_ACCURACY),
            altitudeMeters = null,
            speedMetersPerSecond = null,
            bearingDegrees = null,
            timestampMillis = timestamp,
        )
        _lastPoint.value = point
        _trail.value = listOf(point)
    }

    private companion object {
        const val MAX_TRAIL_POINTS = 500

        const val KEY_LAT = "last_latitude"
        const val KEY_LON = "last_longitude"
        const val KEY_ACCURACY = "last_accuracy"
        const val KEY_TIMESTAMP = "last_timestamp"
        const val KEY_COUNT = "point_count"
        const val KEY_DISTANCE = "distance_meters"
    }
}
