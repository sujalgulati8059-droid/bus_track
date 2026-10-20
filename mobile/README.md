# BusTrack CU - mobile app (Expo SDK 58)
One app, two modes: Student/Faculty and Driver.

    npm install
    npm install -g eas-cli
    eas login
    eas init
    eas build -p android --profile preview

Backend URL: EXPO_PUBLIC_SERVER_URL in eas.json (builds) or mobile/.env (local dev).
Android Google Sign-In: keep the Firebase Android app config in `google-services.json` and register the EAS keystore SHA-1 and SHA-256 fingerprints in Firebase. Rebuild and reinstall the APK after changing fingerprints.
Full steps: ../LAUNCH_GUIDE.md
