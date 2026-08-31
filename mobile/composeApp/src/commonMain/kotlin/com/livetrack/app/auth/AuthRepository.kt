package com.livetrack.app.auth

import com.livetrack.app.KeyValueStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Result of a login attempt. */
sealed interface LoginResult {
    data object Success : LoginResult
    data class Failure(val message: String) : LoginResult
}

/**
 * Local, offline login.
 *
 * This is deliberately a stub: credentials live in [DEMO_ACCOUNTS] below and are
 * checked on the device, so there is no account that can be broken into
 * remotely — but there is also no real security here. Swap [authenticate] for a
 * call to Firebase Auth or your own API when you have a backend; the rest of
 * the app only depends on [currentUser].
 */
class AuthRepository(private val store: KeyValueStore) {

    private val _currentUser = MutableStateFlow(store.getString(KEY_USER))
    val currentUser: StateFlow<String?> = _currentUser.asStateFlow()

    fun login(username: String, password: String): LoginResult {
        val user = username.trim().lowercase()

        if (user.isEmpty()) return LoginResult.Failure("Enter a username.")
        if (password.isEmpty()) return LoginResult.Failure("Enter a password.")

        if (!authenticate(user, password)) {
            return LoginResult.Failure("Wrong username or password.")
        }

        store.putString(KEY_USER, user)
        _currentUser.value = user
        return LoginResult.Success
    }

    fun logout() {
        store.putString(KEY_USER, null)
        _currentUser.value = null
    }

    private fun authenticate(username: String, password: String): Boolean =
        DEMO_ACCOUNTS[username] == password

    companion object {
        /** Replace with a real identity provider before shipping. */
        private val DEMO_ACCOUNTS = mapOf(
            "demo" to "demo1234",
            "test" to "test1234",
        )

        private const val KEY_USER = "session_user"
    }
}
