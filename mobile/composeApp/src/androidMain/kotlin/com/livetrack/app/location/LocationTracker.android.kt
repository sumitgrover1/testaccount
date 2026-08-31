package com.livetrack.app.location

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.livetrack.app.AndroidApp
import com.livetrack.app.KeyValueStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private const val PERMISSION_REQUEST_CODE = 4711
private const val KEY_HAS_ASKED = "has_asked_location_permission"

/**
 * Drives [LocationForegroundService], which is what actually keeps location
 * updates flowing once the app leaves the screen.
 */
class AndroidLocationTracker(
    private val store: KeyValueStore,
) : LocationTracker {

    private val _isTracking = MutableStateFlow(false)
    override val isTracking: StateFlow<Boolean> = _isTracking.asStateFlow()

    private val _permission = MutableStateFlow(readPermission())
    override val permission: StateFlow<LocationPermission> = _permission.asStateFlow()

    override val canRequestMorePermission: Boolean
        get() = _permission.value != LocationPermission.BACKGROUND

    /** Called by the service so the UI reflects the service's real state. */
    internal fun onServiceStateChanged(running: Boolean) {
        _isTracking.value = running
    }

    override fun refreshPermission() {
        _permission.value = readPermission()
    }

    override fun requestPermission() {
        val activity = CurrentActivity.get() ?: return
        store.putString(KEY_HAS_ASKED, "true")

        val requested = when (_permission.value) {
            LocationPermission.BACKGROUND -> return

            // Foreground access first: Android refuses to grant background
            // location until the foreground permission is already held.
            LocationPermission.UNKNOWN, LocationPermission.DENIED -> buildList {
                add(Manifest.permission.ACCESS_FINE_LOCATION)
                add(Manifest.permission.ACCESS_COARSE_LOCATION)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    add(Manifest.permission.POST_NOTIFICATIONS)
                }
            }

            LocationPermission.FOREGROUND_ONLY ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    listOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                } else {
                    emptyList()
                }
        }

        if (requested.isEmpty()) {
            refreshPermission()
            return
        }
        ActivityCompat.requestPermissions(activity, requested.toTypedArray(), PERMISSION_REQUEST_CODE)
    }

    override fun start() {
        refreshPermission()
        if (_permission.value == LocationPermission.UNKNOWN ||
            _permission.value == LocationPermission.DENIED
        ) {
            requestPermission()
            return
        }
        sendToService(LocationForegroundService.ACTION_START)
    }

    override fun stop() {
        sendToService(LocationForegroundService.ACTION_STOP)
        _isTracking.value = false
    }

    private fun sendToService(action: String) {
        val context = AndroidApp.context()
        val intent = Intent(context, LocationForegroundService::class.java).setAction(action)
        if (action == LocationForegroundService.ACTION_START) {
            ContextCompat.startForegroundService(context, intent)
        } else {
            context.startService(intent)
        }
    }

    private fun readPermission(): LocationPermission {
        val context = AndroidApp.context()

        fun granted(permission: String) =
            ContextCompat.checkSelfPermission(context, permission) ==
                PackageManager.PERMISSION_GRANTED

        val hasForeground = granted(Manifest.permission.ACCESS_FINE_LOCATION) ||
            granted(Manifest.permission.ACCESS_COARSE_LOCATION)

        if (!hasForeground) {
            // Only call it a denial once the user has actually seen a prompt.
            return if (store.getString(KEY_HAS_ASKED) != null) {
                LocationPermission.DENIED
            } else {
                LocationPermission.UNKNOWN
            }
        }

        // ACCESS_BACKGROUND_LOCATION only exists from Android 10; before that,
        // foreground permission already covers background use.
        val hasBackground = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION)

        return if (hasBackground) {
            LocationPermission.BACKGROUND
        } else {
            LocationPermission.FOREGROUND_ONLY
        }
    }
}

/**
 * The Android tracker does not publish fixes itself - the foreground service
 * does, straight into the same shared [TrackingRepository].
 */
actual fun createLocationTracker(
    repository: TrackingRepository,
    store: KeyValueStore,
): LocationTracker = AndroidLocationTracker(store)
