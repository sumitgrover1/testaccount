package com.livetrack.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.livetrack.app.location.GeoPoint
import kotlin.math.cos

/**
 * A dependency-free plot of the recorded trail. This is not a map — it is the
 * shape of the path, auto-scaled to the box, so the app stays fully
 * multiplatform and needs no Maps API key. Drop in Google Maps / MapKit later
 * if you want real tiles underneath.
 */
@Composable
fun TrailCanvas(
    points: List<GeoPoint>,
    modifier: Modifier = Modifier,
) {
    val lineColor = MaterialTheme.colorScheme.primary
    val headColor = MaterialTheme.colorScheme.secondary

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        if (points.size < 2) {
            Text(
                text = "Waiting for movement...",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@Box
        }

        Canvas(modifier = Modifier.fillMaxSize()) {
            val padding = 12.dp.toPx()
            val width = size.width - 2 * padding
            val height = size.height - 2 * padding
            if (width <= 0f || height <= 0f) return@Canvas

            val minLat = points.minOf { it.latitude }
            val maxLat = points.maxOf { it.latitude }
            val minLon = points.minOf { it.longitude }
            val maxLon = points.maxOf { it.longitude }

            // A degree of longitude is shorter than a degree of latitude away
            // from the equator; correcting for it keeps the path's shape honest.
            val midLatRadians = ((minLat + maxLat) / 2) * (kotlin.math.PI / 180.0)
            val lonScale = cos(midLatRadians).coerceAtLeast(0.01)

            val spanLat = (maxLat - minLat).coerceAtLeast(MIN_SPAN_DEGREES)
            val spanLon = ((maxLon - minLon) * lonScale).coerceAtLeast(MIN_SPAN_DEGREES)

            // One scale for both axes so the path is not stretched.
            val scale = minOf(width / spanLon, height / spanLat)
            val offsetX = padding + (width - spanLon * scale) / 2
            val offsetY = padding + (height - spanLat * scale) / 2

            fun project(point: GeoPoint): Offset {
                val x = (point.longitude - minLon) * lonScale * scale + offsetX
                // Screen y grows downwards, latitude grows upwards.
                val y = (maxLat - point.latitude) * scale + offsetY
                return Offset(x.toFloat(), y.toFloat())
            }

            val path = Path()
            points.forEachIndexed { index, point ->
                val offset = project(point)
                if (index == 0) path.moveTo(offset.x, offset.y) else path.lineTo(offset.x, offset.y)
            }

            drawPath(
                path = path,
                color = lineColor,
                style = Stroke(width = 3.dp.toPx()),
            )
            drawCircle(
                color = lineColor.copy(alpha = 0.4f),
                radius = 5.dp.toPx(),
                center = project(points.first()),
            )
            drawCircle(
                color = headColor,
                radius = 6.dp.toPx(),
                center = project(points.last()),
            )
            drawCircle(
                color = Color.White,
                radius = 2.dp.toPx(),
                center = project(points.last()),
            )
        }
    }
}

/** Guards against dividing by zero when every fix lands on the same spot. */
private const val MIN_SPAN_DEGREES = 1e-6
