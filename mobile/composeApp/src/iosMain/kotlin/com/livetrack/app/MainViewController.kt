package com.livetrack.app

import androidx.compose.ui.window.ComposeUIViewController
import com.livetrack.app.ui.App
import platform.UIKit.UIViewController

/** Entry point consumed by `ContentView.swift` in the Xcode project. */
fun MainViewController(): UIViewController = ComposeUIViewController { App() }
