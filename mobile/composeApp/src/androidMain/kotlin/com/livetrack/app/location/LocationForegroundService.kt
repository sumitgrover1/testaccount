package com.livetrack.app.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.livetrack.app.AppGraph
import com.livetrack.app.MainActivity

/**
 * Keeps location updates running while the app is in the background.
 *
 * Android only allows sustained background location from a foreground service
 * with a visible notification, so that is what this is. Fixes are published
 * straight into the shared [TrackingRepository], which the UI observes.
 */
class LocationForegroundService : Service() {

    private lateinit var client: FusedLocationProviderClient
    private var requestingUpdates = false

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { publish(it) }
        }
    }

    override fun onCreate() {
        super.onCreate()
        client = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        startInForeground()
        startLocationUpdates()
        trackerState(running = true)
        return START_STICKY
    }

    override fun onDestroy() {
        if (requestingUpdates) {
            client.removeLocationUpdates(locationCallback)
            requestingUpdates = false
        }
        trackerState(running = false)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startInForeground() {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        } else {
            0
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), type)
    }

    private fun startLocationUpdates() {
        if (requestingUpdates) return

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
            .setMinUpdateDistanceMeters(0f)
            .setWaitForAccurateLocation(false)
            .build()

        try {
            client.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
            requestingUpdates = true
            // Show something immediately instead of waiting for the first fix.
            client.lastLocation.addOnSuccessListener { location -> location?.let(::publish) }
        } catch (e: SecurityException) {
            // Permission was revoked between the UI check and here.
            stopSelf()
        }
    }

    private fun publish(location: Location) {
        AppGraph.tracking.publish(location.toGeoPoint())
    }

    private fun trackerState(running: Boolean) {
        (AppGraph.tracker as? AndroidLocationTracker)?.onServiceStateChanged(running)
    }

    private fun buildNotification(): Notification {
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("LiveTrack is tracking")
            .setContentText("Recording your location in the background")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Location tracking",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Shown while LiveTrack records your location"
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        const val ACTION_START = "com.livetrack.app.action.START_TRACKING"
        const val ACTION_STOP = "com.livetrack.app.action.STOP_TRACKING"

        private const val CHANNEL_ID = "livetrack_location"
        private const val NOTIFICATION_ID = 1001

        private const val UPDATE_INTERVAL_MS = 5_000L
        private const val FASTEST_INTERVAL_MS = 2_000L
    }
}

private fun Location.toGeoPoint(): GeoPoint = GeoPoint(
    latitude = latitude,
    longitude = longitude,
    accuracyMeters = if (hasAccuracy()) accuracy.toDouble() else null,
    altitudeMeters = if (hasAltitude()) altitude else null,
    speedMetersPerSecond = if (hasSpeed()) speed.toDouble() else null,
    bearingDegrees = if (hasBearing()) bearing.toDouble() else null,
    timestampMillis = if (time > 0) time else System.currentTimeMillis(),
)
