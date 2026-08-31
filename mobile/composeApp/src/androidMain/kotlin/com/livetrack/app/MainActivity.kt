package com.livetrack.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.livetrack.app.location.CurrentActivity
import com.livetrack.app.ui.App

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        CurrentActivity.set(this)
        setContent { App() }
    }

    override fun onResume() {
        super.onResume()
        CurrentActivity.set(this)
        // Permissions can change while we are away (Settings, or the system
        // revoking them), so re-read them every time we come back.
        AppGraph.tracker.refreshPermission()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        AppGraph.tracker.refreshPermission()
    }

    override fun onDestroy() {
        CurrentActivity.clear(this)
        super.onDestroy()
    }
}
