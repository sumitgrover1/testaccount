package com.livetrack.app

import android.content.Context

private class SharedPreferencesStore(context: Context) : KeyValueStore {
    private val preferences =
        context.getSharedPreferences("livetrack", Context.MODE_PRIVATE)

    override fun getString(key: String): String? = preferences.getString(key, null)

    override fun putString(key: String, value: String?) {
        preferences.edit().apply {
            if (value == null) remove(key) else putString(key, value)
        }.apply()
    }
}

actual fun createKeyValueStore(): KeyValueStore =
    SharedPreferencesStore(AndroidApp.context())
