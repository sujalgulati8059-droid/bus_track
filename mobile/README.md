# BusTrack CU - mobile app (Expo SDK 58)
One app, two modes: Student/Faculty and Driver.

Driver sign-in accepts a phone number and password or Google. Driver accounts created with the app are activated immediately and signed in after registration; route selection happens during account creation, not at sign-in.

    npm install
    npm install -g eas-cli
    eas login
    eas init
    eas build -p android --profile preview

Backend URL: EXPO_PUBLIC_SERVER_URL in eas.json (builds) or mobile/.env (local dev).
Android Google Sign-In: keep the Firebase Android app config in `google-services.json` and register the EAS keystore SHA-1 and SHA-256 fingerprints in Firebase. The backend also needs `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. Rebuild and reinstall the APK after changing fingerprints.
Full steps: ../LAUNCH_GUIDE.md
