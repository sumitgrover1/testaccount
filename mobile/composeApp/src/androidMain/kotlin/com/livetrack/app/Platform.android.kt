package com.livetrack.app

import android.os.Build
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

actual fun platformName(): String = "Android ${Build.VERSION.RELEASE}"

actual fun currentTimeMillis(): Long = System.currentTimeMillis()

private val clockFormat by lazy { SimpleDateFormat("HH:mm:ss", Locale.getDefault()) }

actual fun formatClockTime(epochMillis: Long): String =
    clockFormat.format(Date(epochMillis))
