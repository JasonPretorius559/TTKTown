# TinkerTown Android APK

## First-build scope

The Android app is a thin Capacitor shell around the production TinkerTown site. This
keeps catalogue, marketplace, collections, messaging, uploads and Shorts on the same
Next.js deployment and Firebase data model as the web app.

- Android application ID: `za.co.tinkertown.app`
- App name: `TinkerTown`
- Production origin: `https://ttk-town.vercel.app`
- Minimum deliverable: sideloadable debug APK for device testing
- Network transport: HTTPS only; mixed content remains disabled
- Offline fallback: branded connection message bundled into the APK
- Device media: Android system picker/camera is used by existing photo and video inputs

## Acceptance criteria

- The APK installs and launches on a supported Android device.
- The shell opens only the TinkerTown production origin inside its primary WebView.
- Email/password authentication, navigation, catalogue, collection and marketplace
  screens retain their existing responsive behaviour.
- Photo selection and MP4 Short selection can invoke Android's system media UI.
- Back navigation, external links, authentication, uploads and video playback receive
  a physical-device smoke test before a signed release is distributed.

## Release follow-up

The debug APK is not a Play Store release. A release build still needs a protected
keystore, versioning policy, Play signing, privacy/data-safety declarations and device
testing. Firebase Google popup authentication may reject embedded WebViews; production
distribution should add native Google sign-in or move the Android package to a verified
Trusted Web Activity before Google login is advertised in the APK.

## Current validation

- Debug build: successful with Gradle 8.2.1 and JDK 17
- Package: `za.co.tinkertown.app`, version `1.0` (`versionCode` 1)
- Android range: API 22 minimum, API 34 target
- Signature: valid Android debug certificate with APK Signature Scheme v1 and v2
- Output: `android/app/build/outputs/apk/debug/app-debug.apk`
- SHA-256: `41A4E5EFE859A00AE96DCBC88145476655DAC6D83376A5114296BBBBBEBE3D50`
- Physical-device install and media-picker checks: pending because no Android device was connected during this build
