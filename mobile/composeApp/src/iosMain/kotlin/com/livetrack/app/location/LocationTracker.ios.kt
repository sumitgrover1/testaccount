package com.livetrack.app.location

import com.livetrack.app.KeyValueStore
import com.livetrack.app.UNIX_EPOCH_TO_REFERENCE_SECONDS
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import platform.CoreLocation.CLAuthorizationStatus
import platform.CoreLocation.CLLocation
import platform.CoreLocation.CLLocationManager
import platform.CoreLocation.CLLocationManagerDelegateProtocol
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedAlways
import platform.CoreLocation.kCLAuthorizationStatusAuthorizedWhenInUse
import platform.CoreLocation.kCLAuthorizationStatusDenied
import platform.CoreLocation.kCLAuthorizationStatusRestricted
import platform.CoreLocation.kCLLocationAccuracyBest
import platform.Foundation.NSError
import platform.darwin.NSObject

/**
 * Wraps `CLLocationManager`. Background delivery needs three things and iOS
 * silently stops updating if any is missing:
 *  - the `location` background mode in Info.plist,
 *  - "Always" authorisation from the user,
 *  - `allowsBackgroundLocationUpdates` set while that authorisation is held.
 */
class IosLocationTracker(
    private val repository: TrackingRepository,
) : LocationTracker {

    private val _isTracking = MutableStateFlow(false)
    override val isTracking: StateFlow<Boolean> = _isTracking.asStateFlow()

    private val _permission = MutableStateFlow(LocationPermission.UNKNOWN)
    override val permission: StateFlow<LocationPermission> = _permission.asStateFlow()

    override val canRequestMorePermission: Boolean
        get() = _permission.value != LocationPermission.BACKGROUND

    private val manager = CLLocationManager()

    private val delegate = object : NSObject(), CLLocationManagerDelegateProtocol {
        override fun locationManager(manager: CLLocationManager, didUpdateLocations: List<*>) {
            val location = didUpdateLocations.lastOrNull() as? CLLocation ?: return
            repository.publish(location.toGeoPoint())
        }

        override fun locationManagerDidChangeAuthorization(manager: CLLocationManager) {
            refreshPermission()
        }

        override fun locationManager(manager: CLLocationManager, didFailWithError: NSError) {
            // A transient failure (no signal yet) is normal; updates resume on
            // their own once a fix is available.
        }
    }

    init {
        manager.delegate = delegate
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = MIN_DISTANCE_METERS
        manager.pausesLocationUpdatesAutomatically = false
        refreshPermission()
    }

    override fun refreshPermission() {
        _permission.value = manager.authorizationStatus.toLocationPermission()
    }

    override fun requestPermission() {
        when (_permission.value) {
            // iOS only offers "Always" as an upgrade after "When In Use", so
            // these have to be asked for in order.
            LocationPermission.UNKNOWN -> manager.requestWhenInUseAuthorization()
            LocationPermission.FOREGROUND_ONLY -> manager.requestAlwaysAuthorization()
            LocationPermission.DENIED, LocationPermission.BACKGROUND -> Unit
        }
    }

    override fun start() {
        refreshPermission()
        if (_permission.value == LocationPermission.UNKNOWN ||
            _permission.value == LocationPermission.DENIED
        ) {
            requestPermission()
            return
        }

        if (_permission.value == LocationPermission.BACKGROUND) {
            // Setting this without "Always" authorisation throws.
            manager.allowsBackgroundLocationUpdates = true
            manager.showsBackgroundLocationIndicator = true
        }

        manager.startUpdatingLocation()
        _isTracking.value = true
    }

    override fun stop() {
        manager.stopUpdatingLocation()
        manager.allowsBackgroundLocationUpdates = false
        _isTracking.value = false
    }

    private companion object {
        const val MIN_DISTANCE_METERS = 5.0
    }
}

actual fun createLocationTracker(
    repository: TrackingRepository,
    store: KeyValueStore,
): LocationTracker = IosLocationTracker(repository)

private fun CLAuthorizationStatus.toLocationPermission(): LocationPermission = when (this) {
    kCLAuthorizationStatusAuthorizedAlways -> LocationPermission.BACKGROUND
    kCLAuthorizationStatusAuthorizedWhenInUse -> LocationPermission.FOREGROUND_ONLY
    kCLAuthorizationStatusDenied, kCLAuthorizationStatusRestricted -> LocationPermission.DENIED
    else -> LocationPermission.UNKNOWN
}

@OptIn(ExperimentalForeignApi::class)
private fun CLLocation.toGeoPoint(): GeoPoint {
    val coordinates = coordinate.useContents { latitude to longitude }
    return GeoPoint(
        latitude = coordinates.first,
        longitude = coordinates.second,
        // Core Location reports a negative accuracy when the value is invalid.
        accuracyMeters = horizontalAccuracy.takeIf { it >= 0 },
        altitudeMeters = altitude,
        speedMetersPerSecond = speed.takeIf { it >= 0 },
        bearingDegrees = course.takeIf { it >= 0 },
        timestampMillis = ((timestamp.timeIntervalSinceReferenceDate +
            UNIX_EPOCH_TO_REFERENCE_SECONDS) * 1000).toLong(),
    )
}
