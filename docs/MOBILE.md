# Mobile builds

The Android and iOS projects are generated Capacitor projects, not empty placeholders. Both include the compiled React game, art, original audio, custom icons and splash screens. The same rules and interface power web and mobile. Offline practice works without a backend; online rooms and conversational AI need the deployed server.

## Build / sync the shared client

Use Node 24 and pnpm 11.25.0. In the project folder:

```sh
pnpm install --frozen-lockfile
pnpm mobile:build
pnpm native:sync
```

For online play, put the deployed HTTPS origin (no trailing slash) into `NEXT_PUBLIC_GAME_API_URL` in `.env`, then rebuild and sync. This is public configuration, not a secret. Never copy `OPENAI_API_KEY` into a mobile app.

Native clients authenticate with a device session token and a restricted CORS origin. Web players use an HttpOnly session cookie. The native token is stored on the app's web origin so a restart can rejoin the same seat; clearing app data loses it. No social login or external account recovery is implemented.

## Android

Open the `android` folder in Android Studio, let its supported SDK and Gradle dependencies install, and run on an emulator/device. Or use `pnpm android:open`, then the IDE's Run action. A debug APK can be built with `android/gradlew assembleDebug` from the Android project directory. The included manually triggered GitHub workflow builds and uploads a debug APK from a repository containing this source; it has not been run here.

Android compilation was attempted here but could not download Gradle because the build environment blocks that network connection. Therefore this package contains a real native project and compiled web assets, but no verified APK. Store release signing and a Play Console account remain owner actions.

## iOS

On a Mac with Xcode, run `pnpm ios:open`, choose your signing team and a simulator/device, then build. The generated project uses Swift Package Manager. Xcode is not present in this Linux environment, so no signed iOS binary is included. App Store submission is not performed.

## PWA

After HTTPS hosting, install from Chrome's app install menu or Safari's Share → Add to Home Screen. The web service worker caches art/audio only; it never caches private game responses. For a fully offline first launch use the bundled native client or the included offline browser launcher.

References: https://capacitorjs.com/docs/getting-started and https://capacitorjs.com/docs/config
