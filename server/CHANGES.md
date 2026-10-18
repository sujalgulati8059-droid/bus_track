# BusTrack Pro backend changes

This update extends the existing Express/Mongoose backend. Existing `/api/student` endpoints and email/password and phone/password login routes remain available; the user router is also mounted at `/api/users` for the new flow.

## Files added

- `CHANGES.md` — implementation summary and endpoint test guide.
- `config/seedStudents.js` — one-line student record seeder; run `node config/seedStudents.js UID "Name"` or `npm run seed-students`.
- `models/DriverRequest.js` — pending/approved/rejected driver applications.
- `models/Otp.js` — bcrypt-hashed, expiring, attempt-limited OTP records.
- `models/OtpQuota.js` — rolling one-hour per-phone send quota independent of OTP TTL cleanup.
- `models/StudentRecord.js` — admin-managed UID allowlist.
- `models/Trip.js` — active driver/route trip state.
- `middleware/otpRateLimit.js` — shared IP and phone limits for OTP endpoints.
- `middleware/signupTokenMiddleware.js` — validates the short-lived student signup token.
- `controllers/adminDriverRequestController.js` — driver application review.
- `controllers/adminStudentController.js` — student allowlist import/list/delete.
- `controllers/driverSignupController.js` — driver signup and OTP login.
- `controllers/tripController.js` — start/stop trip operations.
- `controllers/userOtpController.js` — student signup, UID verification and phone OTP login.
- `routes/adminDriverRequestRoutes.js` — protected driver application endpoints.
- `routes/adminStudentRoutes.js` — protected student record endpoints.
- `services/otpService.js` — OTP generation, bcrypt verification and SMS providers.
- `services/phoneService.js` — Indian phone normalization.

## Files edited

- `.env.example` — added OTP/SMS/simulation configuration and replaced example credential values with placeholders.
- `config/db.js` — migrates the optional User email index and ensures required model indexes before listening.
- `controllers/busStatusController.js` — exposes ETA and returns persisted live/last-known tracking state.
- `controllers/driverController.js` — rejects location updates outside an active trip and stops live state by authenticated driver.
- `controllers/userController.js` — retains legacy registration and synchronizes the backward-compatible `assignedStop` with `assignedStops`.
- `models/BusStatus.js` — adds persisted live, trip-start and last-known location fields.
- `models/Driver.js` — allows OTP-approved drivers without passwords while preserving old password login.
- `models/User.js` — allows phone-only accounts, adds `assignedStops`, and uses a sparse unique email index.
- `package.json` — adds the `seed-students` script; no dependencies were added.
- `routes/driverRoutes.js` — adds driver signup, OTP login and trip routes.
- `routes/userRoutes.js` — adds student OTP/UID/signup endpoints while retaining existing routes.
- `server.js` — adds `/api/users` and admin route mounts and initializes Mongo/tracking before listening.
- `services/authService.js` — adds distinct access-token purposes and short-lived signup tokens.
- `services/pushService.js` — adds route/stop bus-near push notifications.
- `socket/trackingSocket.js` — removes default simulation, locks GPS to an authenticated active trip, emits offline/ETA/near-stop updates and supports stop subscriptions.

`Otp` uses a separate `student_login` purpose for returning-student OTPs so login codes cannot be reused as signup verification codes.

## New endpoint test list and exact flow

Set up with Node.js 18+, MongoDB, and `server/.env` containing `JWT_SECRET`, `MONGO_URI`, `SMS_PROVIDER=console`, and `NODE_ENV=development`. Start from `server` using `npm install` then `npm start`. Existing MongoDB routes must already exist; get their exact names and stops using `GET /api/routes`.

All curl examples below use `curl.exe` for Windows PowerShell. Paste each JSON body as shown and copy response values (`token`, `signupToken`, IDs, and local `devOtp`) into the next request. OTPs print in the server log and are returned as `devOtp` only in non-production console mode.

The following commands exercise every new HTTP endpoint. Set each token/ID placeholder from the preceding response. `<ROUTE>` and `<STOP>` must be replaced with actual values from `GET /api/routes`; URL-encode stop names in the ETA URL.

```powershell
$base = "http://localhost:5000"
curl.exe -X POST "$base/api/auth/login" -H "Content-Type: application/json" --data-raw '{"email":"<admin-email>","password":"<admin-password>"}'
$adminToken = "<token from admin login response>"
curl.exe "$base/api/routes"
curl.exe -X POST "$base/api/admin/students/import" -H "Authorization: Bearer $adminToken" -H "Content-Type: application/json" --data-raw '[{"uid":"TEST001","name":"Test Student"}]'
curl.exe -X POST "$base/api/admin/students/import" -H "Authorization: Bearer $adminToken" -H "Content-Type: text/csv" --data-binary "uid,name`nTEST002,Second Test Student"
curl.exe "$base/api/admin/students" -H "Authorization: Bearer $adminToken"

curl.exe -X POST "$base/api/users/otp/send" -H "Content-Type: application/json" --data-raw '{"phone":"9876543210"}'
curl.exe -X POST "$base/api/users/otp/verify" -H "Content-Type: application/json" --data-raw '{"phone":"9876543210","otp":"<student-signup-devOtp>"}'
$signupToken = "<signupToken from OTP verification>"
curl.exe -X POST "$base/api/users/uid/verify" -H "Authorization: Bearer $signupToken" -H "Content-Type: application/json" --data-raw '{"uid":"TEST001"}'
$signupToken = "<new UID-verified signupToken>"
curl.exe -X POST "$base/api/users/signup/complete" -H "Authorization: Bearer $signupToken" -H "Content-Type: application/json" --data-raw '{"name":"Test Student","uid":"TEST001","assignedRoute":"<ROUTE>","assignedStops":["<STOP>"]}'
curl.exe -X POST "$base/api/users/login/otp/send" -H "Content-Type: application/json" --data-raw '{"phone":"+919876543210"}'
curl.exe -X POST "$base/api/users/login/otp/verify" -H "Content-Type: application/json" --data-raw '{"phone":"+919876543210","otp":"<student-login-devOtp>"}'
$studentRecordId = "<_id from GET /api/admin/students>"
curl.exe -X DELETE "$base/api/admin/students/$studentRecordId" -H "Authorization: Bearer $adminToken"

curl.exe -X POST "$base/api/driver/signup/otp/send" -H "Content-Type: application/json" --data-raw '{"phone":"9876543211"}'
curl.exe -X POST "$base/api/driver/signup/request" -H "Content-Type: application/json" --data-raw '{"name":"Test Driver","phone":"9876543211","otp":"<driver-signup-devOtp>","requestedRoute":"<ROUTE>"}'
curl.exe "$base/api/driver/signup/status?phone=9876543211"
curl.exe "$base/api/admin/driver-requests?status=pending" -H "Authorization: Bearer $adminToken"
$driverRequestId = "<_id from pending request>"
curl.exe -X POST "$base/api/admin/driver-requests/$driverRequestId/approve" -H "Authorization: Bearer $adminToken" -H "Content-Type: application/json" --data-raw '{"routeNo":"<ROUTE>"}'
curl.exe -X POST "$base/api/driver/login/otp/send" -H "Content-Type: application/json" --data-raw '{"phone":"9876543211"}'
curl.exe -X POST "$base/api/driver/login/otp/verify" -H "Content-Type: application/json" --data-raw '{"phone":"9876543211","otp":"<driver-login-devOtp>"}'
$driverToken = "<token from driver OTP login>"
curl.exe -X POST "$base/api/driver/trip/start" -H "Authorization: Bearer $driverToken"
curl.exe -X POST "$base/api/driver/location" -H "Authorization: Bearer $driverToken" -H "Content-Type: application/json" --data-raw '{"lat":30.7462,"lng":76.6450,"heading":90}'
curl.exe "$base/api/bus-status/eta?route=<ROUTE>&stop=<URL-ENCODED-STOP>"
curl.exe -X POST "$base/api/driver/location/stop" -H "Authorization: Bearer $driverToken"
curl.exe -X POST "$base/api/driver/trip/stop" -H "Authorization: Bearer $driverToken"

# Rejection branch: send and submit another driver's OTP request first.
curl.exe -X POST "$base/api/driver/signup/otp/send" -H "Content-Type: application/json" --data-raw '{"phone":"9876543212"}'
curl.exe -X POST "$base/api/driver/signup/request" -H "Content-Type: application/json" --data-raw '{"name":"Second Test Driver","phone":"9876543212","otp":"<second-driver-signup-devOtp>","requestedRoute":"<ROUTE>"}'
curl.exe "$base/api/admin/driver-requests?status=pending" -H "Authorization: Bearer $adminToken"
$rejectRequestId = "<_id from the second pending request>"
curl.exe -X POST "$base/api/admin/driver-requests/$rejectRequestId/reject" -H "Authorization: Bearer $adminToken" -H "Content-Type: application/json" --data-raw '{"reason":"Test rejection"}'
curl.exe "$base/api/driver/signup/status?phone=<second-phone>"
```

### Student signup and login — run in this order

1. Sign in as an existing admin and copy its token:

   `POST /api/auth/login` — `{"email":"<admin-email>","password":"<admin-password>"}`

2. Import the test UID, then list records and save the record `_id` for the later delete check:

   `POST /api/admin/students/import` — admin bearer token; JSON body:
   `[{"uid":"TEST001","name":"Test Student"}]`

   `GET /api/admin/students` — admin bearer token.

   CSV alternative for step 2: `POST /api/admin/students/import` with `Content-Type: text/csv` and body `uid,name` followed by `TEST001,Test Student`.

3. Request and verify a student signup OTP:

   `POST /api/users/otp/send` — `{"phone":"9876543210"}`

   `POST /api/users/otp/verify` — `{"phone":"+919876543210","otp":"<devOtp>"}`

4. Verify the UID with the returned signup token; replace it with the newly returned token (UID-verified token):

   `POST /api/users/uid/verify` — signup bearer token; `{"uid":"TEST001"}`

5. Complete the signup. Use a real active route and one or more exact stop names from `GET /api/routes`:

   `POST /api/users/signup/complete` — UID-verified signup bearer token; `{"name":"Test Student","uid":"TEST001","assignedRoute":"<ROUTE>","assignedStops":["<STOP 1>","<STOP 2>"]}`

6. Test the returning-student phone login:

   `POST /api/users/login/otp/send` — `{"phone":"+919876543210"}`

   `POST /api/users/login/otp/verify` — `{"phone":"9876543210","otp":"<devOtp>"}`

7. Delete the test student allowlist record (the already-created User remains registered):

   `DELETE /api/admin/students/<record-id>` — admin bearer token.

### Driver signup, approval, trip and login — run in this order

1. Request the driver signup code:

   `POST /api/driver/signup/otp/send` — `{"phone":"9876543211"}`

2. Submit the verified application:

   `POST /api/driver/signup/request` — `{"name":"Test Driver","phone":"+919876543211","otp":"<devOtp>","requestedRoute":"<ROUTE>"}`

3. Check the public application status:

   `GET /api/driver/signup/status?phone=9876543211`

4. As admin, list pending applications, then approve one. Route override is optional:

   `GET /api/admin/driver-requests?status=pending` — admin bearer token.

   `POST /api/admin/driver-requests/<request-id>/approve` — admin bearer token; optional body `{"routeNo":"<OVERRIDE ROUTE>"}`.

   Recheck using `GET /api/driver/signup/status?phone=9876543211`.

5. Test passwordless driver OTP login:

   `POST /api/driver/login/otp/send` — `{"phone":"9876543211"}`

   `POST /api/driver/login/otp/verify` — `{"phone":"+919876543211","otp":"<devOtp>"}`

6. With the returned driver access token, start a trip:

   `POST /api/driver/trip/start` — driver bearer token.

7. Send a GPS update (the route is taken from the token's active Driver record; a `routeNo` in this body is ignored):

   `POST /api/driver/location` — driver bearer token; `{"lat":30.7462,"lng":76.6450,"heading":90}`

8. Query ETA for a stop on that driver's route:

   `GET /api/bus-status/eta?route=<ROUTE>&stop=<URL-ENCODED-STOP>`

9. End the trip:

   `POST /api/driver/trip/stop` — driver bearer token.

### Driver rejection and status

For the rejection path, submit a second request with a different phone using the signup OTP steps above, then call:

- `GET /api/admin/driver-requests?status=pending` — admin bearer token.
- `POST /api/admin/driver-requests/<request-id>/reject` — admin bearer token; `{"reason":"Test rejection"}`
- `GET /api/driver/signup/status?phone=<second-phone>` — should return `status:"rejected"` with `rejectReason`.

### Socket.IO tracking checks

- Connect to the default Socket.IO namespace and listen for `bus-positions` and `bus-status`; without a driver fix, each position must have `live:false` and a last-known location where available.
- From a student client, emit `watch-route` with `{"routeNo":"<ROUTE>","stop":"<STOP>"}` and listen for route/stop-specific `bus-status` including `etaMinutes` (null while offline) and `bus-near`.
- Connect to `/driver` with the driver access token. After `POST /api/driver/trip/start`, emit `location-update` with `{lat,lng,heading}`. Before a trip starts, the update must be rejected.
- Verify `POST /api/driver/location/stop`, trip stop, and driver socket disconnect each produce a `bus-status` update with `live:false`.
- Only set `ALLOW_SIMULATION=true` when intentionally testing the old demo simulation.

### Existing compatibility checks

- Legacy student email/password endpoints remain `POST /api/student/register` and `POST /api/student/login` (also reachable under `/api/users`).
- Legacy driver phone/password login remains `POST /api/driver/login`.
- Existing admin driver management remains under `/api/admin/drivers`.
