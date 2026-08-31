package com.livetrack.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.livetrack.app.AppGraph

@Composable
fun App() {
    LiveTrackTheme {
        val user by AppGraph.auth.currentUser.collectAsState()

        val currentUser = user
        if (currentUser == null) {
            LoginScreen(auth = AppGraph.auth)
        } else {
            TrackerScreen(
                username = currentUser,
                tracker = AppGraph.tracker,
                tracking = AppGraph.tracking,
                onLogout = {
                    AppGraph.tracker.stop()
                    AppGraph.auth.logout()
                },
            )
        }
    }
}
