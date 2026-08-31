package com.livetrack.app

import platform.Foundation.NSDate
import platform.Foundation.NSDateFormatter
import platform.UIKit.UIDevice

/**
 * Foundation counts seconds from 2001-01-01, the Unix epoch from 1970-01-01.
 * The gap between them is fixed, so converting is a plain subtraction.
 */
internal const val UNIX_EPOCH_TO_REFERENCE_SECONDS = 978_307_200.0

actual fun platformName(): String =
    "${UIDevice.currentDevice.systemName()} ${UIDevice.currentDevice.systemVersion}"

actual fun currentTimeMillis(): Long =
    ((NSDate().timeIntervalSinceReferenceDate + UNIX_EPOCH_TO_REFERENCE_SECONDS) * 1000).toLong()

private val clockFormatter by lazy {
    NSDateFormatter().apply { dateFormat = "HH:mm:ss" }
}

actual fun formatClockTime(epochMillis: Long): String =
    clockFormatter.stringFromDate(
        NSDate(
            timeIntervalSinceReferenceDate =
                epochMillis / 1000.0 - UNIX_EPOCH_TO_REFERENCE_SECONDS,
        ),
    )
