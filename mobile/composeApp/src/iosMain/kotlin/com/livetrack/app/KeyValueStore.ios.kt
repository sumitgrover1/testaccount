package com.livetrack.app

import platform.Foundation.NSUserDefaults

private class UserDefaultsStore : KeyValueStore {
    private val defaults = NSUserDefaults.standardUserDefaults

    override fun getString(key: String): String? = defaults.stringForKey(key)

    override fun putString(key: String, value: String?) {
        if (value == null) {
            defaults.removeObjectForKey(key)
        } else {
            defaults.setObject(value, key)
        }
    }
}

actual fun createKeyValueStore(): KeyValueStore = UserDefaultsStore()
