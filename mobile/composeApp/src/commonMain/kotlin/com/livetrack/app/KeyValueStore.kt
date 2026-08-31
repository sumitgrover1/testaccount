package com.livetrack.app

/**
 * Minimal persistent key/value storage. Backed by SharedPreferences on Android
 * and NSUserDefaults on iOS.
 */
interface KeyValueStore {
    fun getString(key: String): String?
    fun putString(key: String, value: String?)
}

expect fun createKeyValueStore(): KeyValueStore

fun KeyValueStore.getDouble(key: String): Double? = getString(key)?.toDoubleOrNull()

fun KeyValueStore.putDouble(key: String, value: Double?) =
    putString(key, value?.toString())

fun KeyValueStore.getLong(key: String): Long? = getString(key)?.toLongOrNull()

fun KeyValueStore.putLong(key: String, value: Long?) =
    putString(key, value?.toString())
