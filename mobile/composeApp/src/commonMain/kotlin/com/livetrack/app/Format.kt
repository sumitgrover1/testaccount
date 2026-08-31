package com.livetrack.app

import kotlin.math.abs
import kotlin.math.floor

/**
 * Formats a double with a fixed number of decimals. `String.format` is not
 * available in common code, so this is done by hand.
 */
fun Double.formatDecimals(digits: Int): String {
    if (isNaN()) return "--"
    if (isInfinite()) return if (this > 0) "inf" else "-inf"

    var factor = 1L
    repeat(digits) { factor *= 10 }

    // Half-up, not kotlin.math.round's ties-to-even: for display, 0.05 at one
    // decimal should read 0.1, the way String.format would print it.
    val scaled = floor(abs(this) * factor + 0.5).toLong()
    val sign = if (this < 0 && scaled != 0L) "-" else ""
    val whole = scaled / factor
    if (digits == 0) return "$sign$whole"

    val fraction = (scaled % factor).toString().padStart(digits, '0')
    return "$sign$whole.$fraction"
}

/** Formats a distance in metres, switching to kilometres past 1 km. */
fun formatDistance(meters: Double): String =
    if (meters < 1000) "${meters.formatDecimals(0)} m"
    else "${(meters / 1000).formatDecimals(2)} km"

/** Formats a speed given in metres per second as km/h. */
fun formatSpeed(metersPerSecond: Double): String =
    "${(metersPerSecond * 3.6).formatDecimals(1)} km/h"
