package com.livetrack.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.livetrack.app.formatClockTime
import com.livetrack.app.formatDecimals
import com.livetrack.app.formatDistance
import com.livetrack.app.formatSpeed
import com.livetrack.app.location.GeoPoint
import com.livetrack.app.location.LocationPermission
import com.livetrack.app.location.LocationTracker
import com.livetrack.app.location.TrackingRepository

@Composable
fun TrackerScreen(
    username: String,
    tracker: LocationTracker,
    tracking: TrackingRepository,
    onLogout: () -> Unit,
) {
    val isTracking by tracker.isTracking.collectAsState()
    val permission by tracker.permission.collectAsState()
    val lastPoint by tracking.lastPoint.collectAsState()
    val trail by tracking.trail.collectAsState()
    val pointCount by tracking.pointCount.collectAsState()
    val distance by tracking.distanceMeters.collectAsState()

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Header(username = username, isTracking = isTracking, onLogout = onLogout)

            PermissionCard(permission = permission, tracker = tracker)

            CurrentFixCard(point = lastPoint)

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Stat(label = "Fixes", value = pointCount.toString())
                        Stat(label = "Distance", value = formatDistance(distance))
                        Stat(label = "Trail", value = "${trail.size} pts")
                    }
                    TrailCanvas(
                        points = trail,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp)
                            .padding(top = 12.dp),
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = { if (isTracking) tracker.stop() else tracker.start() },
                    enabled = permission != LocationPermission.DENIED,
                    modifier = Modifier.weight(1f),
                ) {
                    Text(if (isTracking) "Stop tracking" else "Start tracking")
                }
                OutlinedButton(
                    onClick = { tracking.clearTrail() },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Reset trail")
                }
            }

            Text(
                text = "Recent fixes",
                style = MaterialTheme.typography.titleSmall,
            )
            LazyColumn(
                modifier = Modifier.fillMaxWidth().weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                items(trail.asReversed()) { point ->
                    Text(
                        text = "${formatClockTime(point.timestampMillis)}  " +
                            "${point.latitude.formatDecimals(5)}, " +
                            point.longitude.formatDecimals(5),
                        style = MaterialTheme.typography.bodySmall,
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

@Composable
private fun Header(username: String, isTracking: Boolean, onLogout: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = "LiveTrack", style = MaterialTheme.typography.titleLarge)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Surface(
                    modifier = Modifier.size(8.dp).clip(CircleShape),
                    color = if (isTracking) {
                        MaterialTheme.colorScheme.secondary
                    } else {
                        Color.Gray
                    },
                ) {}
                Text(
                    text = if (isTracking) "Tracking as $username" else "Paused - $username",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        TextButton(onClick = onLogout) { Text("Log out") }
    }
}

@Composable
private fun PermissionCard(permission: LocationPermission, tracker: LocationTracker) {
    val message = when (permission) {
        LocationPermission.UNKNOWN ->
            "Location access has not been granted yet."
        LocationPermission.DENIED ->
            "Location access was denied. Enable it in system Settings to track."
        LocationPermission.FOREGROUND_ONLY ->
            "Granted while the app is open. Allow all-the-time access to keep " +
                "tracking in the background."
        LocationPermission.BACKGROUND ->
            "Background location granted. Tracking continues when the app is hidden."
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(text = message, style = MaterialTheme.typography.bodySmall)
            if (tracker.canRequestMorePermission) {
                Button(onClick = { tracker.requestPermission() }) {
                    Text("Grant location access")
                }
            }
        }
    }
}

@Composable
private fun CurrentFixCard(point: GeoPoint?) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (point == null) {
                Text(
                    text = "No location yet",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = "Start tracking to get your first fix.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                return@Column
            }

            Text(
                text = "${point.latitude.formatDecimals(6)}, " +
                    point.longitude.formatDecimals(6),
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = buildList {
                    point.accuracyMeters?.let { add("+/- ${it.formatDecimals(0)} m") }
                    point.speedMetersPerSecond?.let { add(formatSpeed(it)) }
                    point.altitudeMeters?.let { add("${it.formatDecimals(0)} m alt") }
                    point.bearingDegrees?.let { add("${it.formatDecimals(0)} deg") }
                    add(formatClockTime(point.timestampMillis))
                }.joinToString("  ·  "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value, style = MaterialTheme.typography.titleMedium)
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}
