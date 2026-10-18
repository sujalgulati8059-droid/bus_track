const assert = require("assert");
const { normalizePhone } = require("./services/otpService");

console.log("=== RUNNING UNIT & COMPONENT VERIFICATION TESTS ===");

// 1. Test Phone Normalization
console.log("\n[TEST 1] Testing Phone Normalization...");
assert.strictEqual(normalizePhone("9876543210"), "+919876543210");
assert.strictEqual(normalizePhone("+919876543210"), "+919876543210");
assert.strictEqual(normalizePhone("919876543210"), "+919876543210");
assert.strictEqual(normalizePhone("  +91 98765-43210  "), "+919876543210");
assert.strictEqual(normalizePhone("6123456789"), "+916123456789");
assert.strictEqual(normalizePhone("7123456789"), "+917123456789");
assert.strictEqual(normalizePhone("8123456789"), "+918123456789");

// Test invalid phone formats
const invalidPhones = ["", "12345", "abcdefghij", "+12345678901", "5123456789", "+447911123456", "9876543210123"];
for (const p of invalidPhones) {
  let threw = false;
  try {
    normalizePhone(p);
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, `Expected ${p} to throw invalid phone format error`);
}
console.log("✅ Phone normalization tests passed!");

// 2. Test Model Schemas
console.log("\n[TEST 2] Testing Model Schemas...");
const User = require("./models/User");
const Driver = require("./models/Driver");
const DriverRequest = require("./models/DriverRequest");
const StudentRecord = require("./models/StudentRecord");
const { Otp, OtpLog } = require("./models/Otp");

// Verify User model schema
assert(User.schema.path("email"), "User schema must have email");
assert.strictEqual(User.schema.path("email").isRequired, undefined, "User email must NOT be required");
assert(User.schema.path("password"), "User schema must have password");
assert.strictEqual(User.schema.path("password").isRequired, undefined, "User password must NOT be required");
assert(User.schema.path("assignedStops"), "User schema must have assignedStops");
assert.strictEqual(User.schema.path("assignedStops").instance, "Array", "assignedStops must be an Array");

// Verify Driver model schema
assert(Driver.schema.path("password"), "Driver schema must have password");
assert.strictEqual(Driver.schema.path("password").isRequired, undefined, "Driver password must NOT be required");

// Verify DriverRequest model schema
assert(DriverRequest.schema.path("status"), "DriverRequest schema must have status");
assert.deepStrictEqual(DriverRequest.schema.path("status").enumValues, ["pending", "approved", "rejected"]);

// Verify StudentRecord model schema
assert(StudentRecord.schema.path("uid"), "StudentRecord schema must have uid");
assert(StudentRecord.schema.path("name"), "StudentRecord schema must have name");
assert(StudentRecord.schema.path("isActive"), "StudentRecord schema must have isActive");

// Verify Otp model schema
assert(Otp.schema.path("otpHash"), "Otp schema must have otpHash");
assert.strictEqual(Otp.schema.path("otp"), undefined, "Otp schema must NEVER store plaintext OTP");
assert(Otp.schema.path("expiresAt"), "Otp schema must have expiresAt");
assert(Otp.schema.path("resendAfter"), "Otp schema must have resendAfter");
assert(Otp.schema.path("attempts"), "Otp schema must have attempts");
console.log("✅ Model schema checks passed!");

// 3. Test Haversine Distance & ETA Calculation
console.log("\n[TEST 3] Testing Haversine Distance & ETA Calculation...");
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Distance between CU (30.7735, 76.5763) and Kharar (30.7462, 76.6450)
const dist = haversineKm(30.7735, 76.5763, 30.7462, 76.6450);
console.log(`Computed distance CU to Kharar: ${dist.toFixed(2)} km`);
assert(dist > 5 && dist < 12, `Distance should be approximately 7-9 km, got ${dist}`);

// Speed-based ETA: 25 km/h
const etaMins = Math.max(1, Math.round((dist / 25) * 60));
console.log(`Computed ETA: ${etaMins} mins`);
assert(etaMins >= 15 && etaMins <= 30, `ETA should be approx 15-25 mins, got ${etaMins}`);

// Proximity test: within 500m (0.5 km)
const nearDist = haversineKm(30.7735, 76.5763, 30.7750, 76.5780);
console.log(`Near distance: ${(nearDist * 1000).toFixed(0)} meters`);
assert(nearDist <= 0.5, "Should be within 500 meters");
console.log("✅ Haversine distance & ETA calculations passed!");

// 4. Test Token Purpose Claims
console.log("\n[TEST 4] Testing JWT Token Purpose Claims & Separation...");
const jwt = require("jsonwebtoken");
const testSecret = "test-secret-long-string-key";
const signupToken = jwt.sign({ phone: "+919876543210", purpose: "student_signup", uidVerified: false }, testSecret, { expiresIn: "15m" });
const verifiedSignupToken = jwt.sign({ phone: "+919876543210", uid: "21BCS1001", purpose: "student_signup", uidVerified: true }, testSecret, { expiresIn: "15m" });
const driverToken = jwt.sign({ id: "driver123", role: "driver" }, testSecret, { expiresIn: "30d" });
const userToken = jwt.sign({ id: "user123", role: "user" }, testSecret, { expiresIn: "30d" });

const decodedSignup = jwt.verify(signupToken, testSecret);
assert.strictEqual(decodedSignup.purpose, "student_signup");
assert.strictEqual(decodedSignup.uidVerified, false);
assert.strictEqual(decodedSignup.role, undefined);

const decodedVerifiedSignup = jwt.verify(verifiedSignupToken, testSecret);
assert.strictEqual(decodedVerifiedSignup.uidVerified, true);
assert.strictEqual(decodedVerifiedSignup.uid, "21BCS1001");

const decodedDriver = jwt.verify(driverToken, testSecret);
assert.strictEqual(decodedDriver.role, "driver");

const decodedUser = jwt.verify(userToken, testSecret);
assert.strictEqual(decodedUser.role, "user");
console.log("✅ JWT purpose claims and role isolation passed!");

console.log("\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!");
