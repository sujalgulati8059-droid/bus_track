# BusTrack Pro Backend — Surgical Additions & Enhancements

This document details all new files and surgical edits made to the BusTrack Pro backend. Every existing endpoint, model field, authentication middleware, and admin panel function remains 100% backward compatible.

---

## 1. Summary of Deliverables

- **Student Signup & Login**: 4-step verified signup flow (Phone OTP → UID Verification against university records → Stop Selection & Password Setup), followed by phone-and-password login. Existing passwordless accounts can set a password after one OTP login.
- **UID Verification & Management**: University `StudentRecord` collection with admin import (JSON/CSV), query, and deletion endpoints + `seedStudents.js` script.
- **Driver Signup & Approval Workflow**: `DriverRequest` collection with partial index (unique pending phone), OTP verification, password setup, admin review (`/approve` / `/reject` with optional route override), and phone-and-password login. Existing passwordless accounts can set a password after one OTP login.
- **Route-Locked Live Tracking & Active Trip State**: Strict route-locking to authenticated driver, Trip Start/Stop lifecycle (`/trip/start` and `/trip/stop`), instant `live: false` broadcast on disconnect, simulation gated behind `ALLOW_SIMULATION=true`, Haversine-based ETA calculations (`/api/bus-status/eta`), and ~500m "bus-near" proximity events + Web Push notifications.
- **Security & Quality**: Bcrypt-hashed OTP storage, TTL index auto-deletion, 30s resend cooldown, max 5 OTPs per hour per phone, dual express-rate-limiters (per IP + per phone), constant-time compare, strict JWT purpose claim separation (`student_signup` vs `user` vs `driver`), and built-in Node 18+ `fetch` without extraneous dependencies.

---

## 2. New Files Created

1. `backend/models/Otp.js`
   - `Otp` schema: `phone`, `otpHash` (bcrypt), `purpose` ("student_signup" | "driver_signup" | "driver_login" | "student_login"), `expiresAt` (TTL index), `attempts` (max 5), `resendAfter` (30s cooldown).
   - `OtpLog` schema: `phone`, `purpose`, `createdAt` with 1-hour TTL index for enforcing the maximum 5 OTPs per phone per hour limit.

2. `backend/models/StudentRecord.js`
   - Schema: `uid` (unique, uppercase, trimmed), `name` (string), `isActive` (boolean, default true).

3. `backend/models/DriverRequest.js`
   - Schema: `name`, `phone`, bcrypt-hashed `password`, `requestedRoute`, `status` ("pending" | "approved" | "rejected"), `rejectReason`, `reviewedBy` (Admin ref), `reviewedAt`, `phoneVerified`.
   - Partial unique index: `phone` is unique ONLY while `status: "pending"`.

4. `backend/services/otpService.js`
   - `normalizePhone(rawPhone)`: Validates and normalizes to `+91XXXXXXXXXX`. Accepts 10 digits, `+91`, or `91` prefix; rejects all invalid formats.
   - `sendSms(phone, text)`: Provider abstraction supporting `"console"` (dev default), `"msg91"`, and `"twilio"` using native Node 18+ `fetch`.
   - `generateAndSendOtp({ phone, purpose })`: Generates 6-digit OTP, bcrypt hash, checks 30s cooldown and 5/hour limit, returns `devOtp` only in dev console mode.
   - `verifyOtp({ phone, purpose, otp })`: Validates OTP with constant-time bcrypt compare, tracks attempts (max 5), deletes OTP on success.
   - `otpIpLimiter` and `otpPhoneLimiter`: Express rate-limiting middleware per IP (30 req / 15 min) and per phone (5 req / 15 min).

5. `backend/controllers/adminStudentController.js`
   - `importStudents`: Bulk import student records via JSON array `[{ uid, name }]` or CSV string format.
   - `listStudents`: View and search student records (`?q=`, `?page=`, `?limit=`).
   - `deleteStudent`: Delete a student record by ID or UID.

6. `backend/routes/adminStudentRoutes.js`
   - Mounts `POST /import`, `GET /`, and `DELETE /:id` protected with `protect` and `restrictTo("admin", "superadmin")`.

7. `backend/controllers/adminDriverRequestController.js`
   - `listDriverRequests`: List pending or all driver requests with reviewer populated.
   - `approveDriverRequest`: Approves request, creates/reactivates `Driver` with assigned route (optionally overridden by admin in body), sets `status: "approved"` and marks reviewed.
   - `rejectDriverRequest`: Rejects request with specified reason, marks reviewed.

8. `backend/routes/adminDriverRequestRoutes.js`
   - Mounts `GET /`, `POST /:id/approve`, `PUT /:id/approve`, `POST /:id/reject`, `PUT /:id/reject` with admin protection.

9. `backend/config/seedStudents.js`
   - Seeds sample university student UIDs (`21BCS1001` - `21BCS1010`) into `StudentRecord` collection.

---

## 3. Modified Files

1. `backend/models/User.js`
   - Made `email` optional with `sparse: true` unique index (preserves legacy email accounts).
   - Retains optional passwords for legacy accounts; verified signup now requires a password and supports phone-based login.
   - Added `assignedStops: [String]` (keeps `assignedStop` = first stop for backward compatibility).
   - Updated `pre("save")` and `comparePassword` hooks to safely handle passwordless users.

2. `backend/models/Driver.js`
   - Retains optional passwords for legacy approved drivers; new driver requests carry a bcrypt-hashed password that is copied to the driver account on approval.
   - Updated `pre("save")` and `comparePassword` hooks to safely handle passwordless drivers.

3. `backend/controllers/userController.js`
   - Step A: `sendSignupOtp` (`POST /api/users/otp/send`)
   - Step B: `verifySignupOtp` (`POST /api/users/otp/verify`) returning `signupToken`
   - Step C: `verifyUid` (`POST /api/users/uid/verify`) checking `StudentRecord` and issuing `uidVerified: true` token
   - Step D: `completeSignup` (`POST /api/users/signup/complete`) creating User using verified phone & UID from token, validating route and multiple `assignedStops`
   - Returning student phone/password login plus OTP fallback; legacy passwordless users can set a password with a short-lived OTP setup token (`POST /api/users/password/setup`).
   - Preserved all existing legacy student methods.

4. `backend/routes/userRoutes.js`
   - Mounted OTP signup routes (`/otp/send`, `/otp/verify`, `/uid/verify`, `/signup/complete`).
   - Mounted OTP login routes (`/login/otp/send`, `/login/otp/verify`).
   - Applied `otpIpLimiter` and `otpPhoneLimiter`.

5. `backend/controllers/driverController.js`
   - Added `sendDriverSignupOtp` (`POST /api/driver/signup/otp/send`).
   - Added `verifyDriverSignupOtp` (`POST /api/driver/signup/otp/verify`) and `submitDriverSignupRequest` (`POST /api/driver/signup/request`) with password setup after OTP verification.
   - Added `getDriverSignupStatus` (`GET /api/driver/signup/status?phone=`).
   - Added `sendDriverLoginOtp` (`POST /api/driver/login/otp/send`).
   - Added `verifyDriverLoginOtp` (`POST /api/driver/login/otp/verify`) and password setup for legacy drivers (`POST /api/driver/password/setup`).
   - Added `startTrip` (`POST /api/driver/trip/start`) and `stopTrip` (`POST /api/driver/trip/stop`).
   - Updated `updateLocation`: route is strictly locked to `req.driver.routeNo`, accepted ONLY while trip is active.

6. `backend/routes/driverRoutes.js`
   - Mounted driver signup OTP routes, request, status, password setup, login OTP routes, and trip start/stop routes.

7. `backend/routes/adminDriverRoutes.js`
   - Added POST handlers for `/:id/approve` and `/:id/reject` in addition to PUT for universal dashboard compatibility.

8. `backend/controllers/busStatusController.js`
   - Added `getEta` handler (`GET /api/bus-status/eta?route=&stop=`) calculating speed-based ETA & distance via Haversine.

9. `backend/routes/busStatusRoutes.js`
   - Mounted `GET /eta` route.

10. `backend/socket/trackingSocket.js`
    - Locked location updates in `/driver` namespace strictly to `socket.driver.routeNo`.
    - Added trip state tracking (`tripActive`, `tripStartedAt`, `driverId`).
    - Made location updates accepted ONLY while trip is active.
    - Immediately set `live: false` and emit `bus-status` `{ routeNo, live: false }` on disconnect or stop-sharing.
    - Gated simulation behind `ALLOW_SIMULATION=true` env var; when false, does NOT simulate bus movement and emits `live: false` with `lastKnown` and `lastUpdated`.
    - Added Haversine distance and speed-based ETA calculations.
    - Added proximity detection ("bus-near") within ~500m of student stops with rate-limiting and web push notification.

11. `backend/services/pushService.js`
    - Added `notifyBusNear(routeNo, stop, distanceMeters)` for proximity push alerts.
    - Added `notifyAdminNewDriverRequest(driverRequest)` for admin push notifications.

12. `backend/server.js`
    - Mounted `/api/users` (in addition to `/api/student`).
    - Mounted `/api/admin/students`.
    - Mounted `/api/admin/driver-requests`.
    - Initialized tracking and attached `io.trackingApi` before route execution.

13. `backend/.env.example`
    - Added `SMS_PROVIDER`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`, `OTP_EXPIRY_MIN`, `ALLOW_SIMULATION`.

14. `backend/package.json`
    - Added `"seed-students": "node config/seedStudents.js"` script.
