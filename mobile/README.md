# LiveTrack

One Kotlin codebase, one UI, running as a native app on **Android and iOS**.
Log in, then watch your location update live — including while the app is in
the background.

Built with **Kotlin Multiplatform + Compose Multiplatform**, which is the
Android-native answer to cross-platform: the same Compose UI you would write
for Android compiles to a real iOS app, and only the parts that genuinely
differ (location APIs, storage) are written per platform.

## What it does

- **Login** — username/password, session remembered across restarts.
- **Live location** — latitude, longitude, accuracy, speed, altitude, bearing,
  refreshing roughly every 5 seconds.
- **Background tracking** — updates keep coming when the app is off screen.
  On Android that is a foreground service with an ongoing notification; on iOS
  it is `CLLocationManager` with the `location` background mode.
- **Trail** — the last 500 fixes, drawn as a self-scaling plot, plus total
  distance travelled. Fix count and distance survive the process being killed.

## Layout

```
mobile/
├── composeApp/src/
│   ├── commonMain/     shared: UI, auth, trail/distance logic  (compiles for both)
│   ├── androidMain/    Activity, Application, foreground service, FusedLocation
│   └── iosMain/        Compose entry point, CLLocationManager
└── iosApp/             the SwiftUI shell that hosts the shared UI
```

Anything platform-specific goes through a small `expect`/`actual` seam —
`createLocationTracker`, `createKeyValueStore`, `formatClockTime`. Everything
else, including every screen, is written once.

## Running it

### Android

Needs Android Studio (Ladybug or newer) with the **Kotlin Multiplatform** plugin.

```bash
cd mobile
./gradlew :composeApp:assembleDebug        # or press Run in Android Studio
```

Install `composeApp/build/outputs/apk/debug/composeApp-debug.apk` on a device.
An emulator works too, but you will need to feed it mock locations from
Extended Controls to see the trail move.

The APK ships with no Gradle wrapper JAR — run `gradle wrapper` once in
`mobile/`, or just open the project in Android Studio and let it generate one.

### iOS

Needs a **Mac with Xcode**. There is no `.xcodeproj` checked in, so create the
shell once:

1. Open the `mobile` folder in Android Studio with the KMP plugin and let it
   generate the iOS app, **or** create a new iOS App target in Xcode named
   `iosApp` and drop in `iosApp/iosApp/*.swift` and `Info.plist`.
2. Add a Run Script build phase, before "Compile Sources":
   ```
   cd "$SRCROOT/.."
   ./gradlew :composeApp:embedAndSignAppleFrameworkForXcode
   ```
3. Set **Framework Search Paths** to
   `$(SRCROOT)/../composeApp/build/xcode-frameworks/$(CONFIGURATION)/$(SDK_NAME)`.
4. Deployment target iOS 15 or later.
5. Under Signing & Capabilities, add **Background Modes → Location updates**.

`iosApp/iosApp/Info.plist` already carries the two usage strings and the
background mode; iOS refuses background location without all three.

## Permissions

Both platforms need location granted *twice* — first for foreground use, then
as an upgrade to all-the-time/Always access. The app asks in that order,
because both platforms reject a background request that comes first. Until the
second grant lands, tracking works but stops when the app leaves the screen.

Android additionally asks for notification permission on Android 13+; the
foreground service cannot run without a visible notification.

## Login is a stub

Credentials are checked on-device in `AuthRepository` against two demo
accounts (`demo`/`demo1234`, `test`/`test1234`). Nothing is sent anywhere, so
there is no account to break into — but there is also no real security here.
Replace `AuthRepository.authenticate` with Firebase Auth or your own API when
you have a backend; the rest of the app only depends on `currentUser`.

## Location stays on the device

Fixes are never uploaded. The trail lives in memory, and only the summary —
last fix, count, distance — is persisted locally. If you want a second device
or a dashboard to watch this one, that needs a backend adding.
