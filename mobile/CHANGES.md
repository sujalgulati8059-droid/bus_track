# BusTrack Pro Mobile - Changes & Migration Guide

## 1. Overview
This update implements the full mobile frontend enhancements for the BusTrack Pro platform (Expo SDK 58 / React Native), corresponding to Prompt 2. It integrates seamlessly with the new backend (Phone OTP authentication, UID verification, driver approval workflows, route-locked trip tracking, and real-time socket events).

---

## 2. Dependencies & Configuration

### New Packages Installed
```bash
cd mobile
npx expo install expo-notifications expo-dev-client
```
- `expo-notifications` (`~58.1.5`): Local notifications and alert banners for the `bus-near` arrival event.
- `expo-dev-client` (`~58.0.14`): Enables local development client builds (`npx expo start --dev-client`).

### Updated `app.json` Configuration, Permissions & Plugins
- **App Scheme**: `"scheme": "bustrack-cu"` for deep linking and development build client connections.
- **Android Permissions**:
  - `android.permission.ACCESS_FINE_LOCATION`
  - `android.permission.ACCESS_COARSE_LOCATION`
  - `android.permission.FOREGROUND_SERVICE`
  - `android.permission.FOREGROUND_SERVICE_LOCATION`
  - `android.permission.POST_NOTIFICATIONS`
- **Plugins**:
  - `expo-location`: configured with `"isAndroidForegroundServiceEnabled": true` and `"isAndroidBackgroundLocationEnabled": false` for safe Android foreground service location sharing.
  - `expo-notifications`: configured with custom app icon and brand color (`#facc15`).

---

## 3. Modified & New Files Summary

### A. Common & Student Components
- **`src/student/components/OtpInput.js` (NEW)**:
  - Reusable 6-digit OTP input component.
  - Auto-focus on mount, automatic forward-advance as digits are typed, and backspace retreat.
  - Full clipboard paste handling (splits pasted 6-digit codes across all boxes).
  - Configured with `textContentType="oneTimeCode"` and `autoComplete="sms-otp"` for native Android/iOS SMS autofill.

- **`src/student/components/LiveMap.js` (UPDATED)**:
  - Switched tile provider to **OpenStreetMap** (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`), removing the CARTO "API key required" watermark.
  - Added CSS marker transition `.bus-marker { transition: transform 0.8s linear; }` for smooth vehicle gliding between socket pings.
  - Dynamic heading indicator: bus marker includes an outer rotating arrow (`b.heading`) that rotates in real-time while keeping the bus route label upright.
  - Multi-stop highlighting: student's preferred stops (`myStops`) are rendered in vibrant blue (`#2563eb`) with a prominent `"★ Your Boarding Stop"` popup, while standard route stops remain in the route theme color.
  - Dynamic live/offline styling with green glowing border for live trips and muted grey for offline buses.

### B. Student Screens & APIs
- **`src/student/api/client.js` (UPDATED)**:
  - 401 response interceptor now ignores OTP send/verify, UID verify, signup complete, and password setup endpoints so authentication-flow errors do not unexpectedly purge stored user tokens.

- **`src/student/api/studentApi.js` (UPDATED)**:
  - Added `sendSignupOtp(phone)`: `POST /users/otp/send`
  - Added `verifySignupOtp(phone, otp)`: `POST /users/otp/verify` (returns `signupToken`)
  - Added `verifyUid(uid, signupToken)`: `POST /users/uid/verify` (validates `StudentRecord` and returns updated `signupToken` with `uidVerified: true` and `prefillName`)
  - Added `completeSignup(payload, signupToken)`: `POST /users/signup/complete`
  - Added `setupPassword(password, setupToken)`: `POST /users/password/setup` for existing passwordless accounts after OTP verification.
  - Student signup now requires a password set in a dialog after phone and UID verification; login defaults to phone and password.
  - Added `sendLoginOtp(phone)`: `POST /users/login/otp/send`
  - Added `verifyLoginOtp(phone, otp)`: `POST /users/login/otp/verify`
  - Added `getBusEta(routeNo, stop)`: `GET /users/eta/:routeNo?stop=...`

- **`src/student/context/AuthContext.js` (UPDATED)**:
  - Added `loginWithSession(token, user)` helper to initialize session directly from completed OTP flows.

- **`src/student/context/SocketContext.js` (UPDATED)**:
  - Android notification channel setup (`bus-alerts`) with `AndroidImportance.HIGH` and vibration.
  - Added listener for `bus-near` socket event, triggering a local push notification (`"Bus Approaching Stop!"`).
  - Added listener for `bus-status` socket event to instantly update `live` boolean flags on bus positions.
  - `AppState` listener: automatically reconnects socket and requests latest bus positions when the app transitions back to `active` foreground.

- **`src/student/screens/AuthScreen.js` (REWRITTEN)**:
  - Converted registration form into a 4-step wizard:
    1. **Step 1 (Phone)**: Validates 10-digit phone, prepends `+91`, sets `autoComplete="tel"` and `textContentType="telephoneNumber"` to block unwanted email autofill.
    2. **Step 2 (OTP)**: 6-box input, 30s resend timer, remaining attempt alerts, and dev OTP helper banner in development.
    3. **Step 3 (UID Check)**: Verifies student UID against database; pre-fills verified name.
    4. **Step 4 (Details & Route Selection)**: Editable name, locked UID, locked phone, morning route picker, and multi-select chip interface for preferred boarding stops (`assignedStops`).
  - State persistence: wizard progress and intermediate tokens are saved to `AsyncStorage` (`student_signup_wizard_state`) so the wizard survives app backgrounding or interruptions.
  - Returning students: Phone + password login by default, with OTP fallback for existing passwordless accounts and one-time password setup.

- **`src/student/screens/MyBusScreen.js` (UPDATED)**:
  - Bus status card: displays `"🟢 Bus is LIVE – arriving at <stop> in X min"` when live or `"⚪ Bus not live yet (last seen X ago)"` when offline.
  - Multi-stop chip selector allows switching between student's assigned preferred stops.
  - Refreshes bus status and ETA automatically when app returns to foreground.

- **`src/student/screens/MapScreen.js` (UPDATED)**:
  - Defaults to student's assigned route when no external route is focused.
  - Floating status banner showing live ETA chip (`"~X min to <stop>"`) or `"Driver offline – last seen X min ago"`.
  - Preferred stop chips allow switching active stop ETA calculations on the fly.
  - Passes full `myStops` array to `LiveMap`.

### C. Driver App & Tracking
- **`src/driver/api/driverApi.js` (UPDATED)**:
  - Added `sendDriverSignupOtp(phone)`: `POST /driver/signup/otp/send`
  - Added `verifyDriverSignupOtp(data)`: `POST /driver/signup/otp/verify`
  - Added `submitDriverSignupRequest(data)`: `POST /driver/signup/request`
  - Added `getDriverSignupStatus(phone)`: `GET /driver/signup/status?phone=...`
  - Added `sendDriverLoginOtp(phone)`: `POST /driver/login/otp/send`
  - Added `verifyDriverLoginOtp(phone, otp)`: `POST /driver/login/otp/verify`
  - Added `setupPassword(password, setupToken)`: `POST /driver/password/setup` for existing passwordless drivers.
  - Added `startDriverTrip(vehicleNo)`: `POST /driver/trip/start`
  - Added `stopDriverTrip()`: `POST /driver/trip/stop`

- **`src/driver/context/AuthContext.js` (UPDATED)**:
  - Added `loginWithSession(token, driver)` helper for phone OTP driver login.

- **`src/driver/DriverApp.js` (UPDATED)**:
  - Renders unified `LoginScreen` (Login / Request Access tabs) and `RouteScreen` once authenticated.

- **`src/driver/screens/LoginScreen.js` (REWRITTEN)**:
  - Two tabs: **Login** & **Request access**.
  - **Login Tab**: Phone and password by default; OTP fallback allows existing passwordless drivers to set a password once.
  - **Request Access Tab**:
    1. Driver enters full name, phone number, and selects requested morning route.
    2. Enters OTP to verify phone ownership.
    3. Sets and confirms a password in a dialog, then submits the verified request.
    4. Automatically enters 15-second polling status screen (`GET /driver/signup/status?phone=...`):
       - **Pending (⏳)**: "Your request is awaiting administrator approval."
       - **Approved (✅)**: Green banner with direct "Log In Now" action button.
       - **Rejected (❌)**: Red banner with admin's reason and "Request Again" option.

- **`src/driver/services/locationSharing.js` (UPDATED)**:
  - Checks GPS hardware availability via `Location.hasServicesEnabledAsync()`. Prompts driver to turn on GPS if disabled.
  - Checks location permissions (`requestForegroundPermissionsAsync`). If permanently denied (`canAskAgain: false`), provides prompt with direct `Linking.openSettings()` button.
  - Manages foreground location updates task with persistent Android notification.
  - Provides `subscribePingStatus` telemetry callback for UI feedback (`lastPingTime`, `online`, `retrying`).

- **`src/driver/screens/RouteScreen.js` (REWRITTEN)**:
  - Shows assigned route locked from server (`driver.routeNo`), preventing manual route tampering.
  - **"Start Trip"**: Prompts confirmation dialog:
    *"Share live location? Students on Route <X> will see your bus live. Allow location access and keep this on until your trip ends."*
    - Checks GPS & permissions -> starts foreground tracking task -> calls `POST /driver/trip/start`.
    - Persists active trip state in `AsyncStorage` (`driver_active_trip`).
  - **Live Trip Banner**:
    - Displays green flashing LIVE indicator and live elapsed trip timer (`MM:SS`).
    - Telemetry bar: `"🟢 Online • Last ping 2s ago"` or `"🟠 Retrying location ping..."`.
  - **"End Trip"**: Prompts confirmation dialog -> stops location tracking task -> calls `POST /driver/trip/stop`.
  - Retains route stop list and passenger count breakdown for each stop.

---

## 4. Verification & Testing

### Verification Checklist
- [x] Student Phone Input blocks email autofill (`autoComplete="tel"`, `textContentType="telephoneNumber"`).
- [x] Student OTP input features 6 boxes, auto-focus, paste support, and SMS autofill code type.
- [x] Student UID verification checks `StudentRecord` collection and pre-fills verified name.
- [x] Details form locked fields (UID, phone) and multi-select stop chips.
- [x] Student signup wizard state persists across app closures/backgrounding in `AsyncStorage`.
- [x] Driver Request Access flow submits request and polls approval status every 15s.
- [x] Driver passwordless login with phone OTP.
- [x] Driver assigned route is read-only.
- [x] Start Trip dialog with GPS enable checks, permission handling, and `Linking.openSettings()` fallback.
- [x] Driver elapsed timer and live location telemetry banner.
- [x] End Trip confirmation dialog and trip termination API call.
- [x] Leaflet map uses OpenStreetMap tiles without CARTO watermark.
- [x] Smooth CSS transitions for bus marker movement and heading arrow rotation.
- [x] Multi-stop highlighting for student's preferred boarding stops.
- [x] Offline status chip when driver is not sharing live location.
- [x] Automatic socket reconnection and state re-fetching on app foregrounding.
