package com.livetrack.app

/** Human readable name of the platform the app is currently running on. */
expect fun platformName(): String

/** Wall-clock time in milliseconds since the Unix epoch. */
expect fun currentTimeMillis(): Long

/** Formats an epoch millisecond value as a local `HH:mm:ss` string. */
expect fun formatClockTime(epochMillis: Long): String
