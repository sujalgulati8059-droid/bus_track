const express = require("express");
const r = express.Router();
const {
  login,
  logout,
  getMe,
  getMyRoute,
  updateDaySchedule,
  setTodayStatus,
  getPassengerBreakdown,
  updateLocation,
  stopLocation,
  register,
  startTrip,
  stopTrip,
  sendDriverSignupOtp,
  verifyDriverSignupOtp,
  submitDriverSignupRequest,
  getDriverSignupStatus,
  sendDriverLoginOtp,
  verifyDriverLoginOtp,
  setupPassword,
} = require("../controllers/driverController");
const { protectDriver } = require("../middleware/authMiddleware");
const { otpIpLimiter, otpPhoneLimiter } = require("../services/otpService");

const regLimit = require("express-rate-limit")({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { success: false, error: "Too many requests. Try again later." },
});

// Driver Signup & Approval Flow (Phone OTP)
r.post("/signup/otp/send", otpIpLimiter, otpPhoneLimiter, sendDriverSignupOtp);
r.post("/signup/otp/verify", otpIpLimiter, otpPhoneLimiter, verifyDriverSignupOtp);
r.post("/signup/request", otpIpLimiter, otpPhoneLimiter, submitDriverSignupRequest);
r.get("/signup/status", otpIpLimiter, getDriverSignupStatus);

// Driver Login (Phone OTP, no password)
r.post("/login/otp/send", otpIpLimiter, otpPhoneLimiter, sendDriverLoginOtp);
r.post("/login/otp/verify", otpIpLimiter, otpPhoneLimiter, verifyDriverLoginOtp);
r.post("/password/setup", otpIpLimiter, setupPassword);

// Trip Management (Sets BusStatus / live flag, stores startedAt)
r.post("/trip/start", protectDriver, startTrip);
r.post("/trip/stop", protectDriver, stopTrip);

// Location Updates (Route-locked to driver's routeNo, accepted only while trip is active)
r.post("/location", protectDriver, updateLocation);
r.post("/location/stop", protectDriver, stopLocation);

// Existing Legacy Driver Endpoints
r.post("/register", regLimit, register);
r.post("/login", login);
r.post("/logout", protectDriver, logout);
r.get("/me", protectDriver, getMe);
r.get("/route", protectDriver, getMyRoute);
r.put("/route/schedule/:day", protectDriver, updateDaySchedule);
r.put("/status", protectDriver, setTodayStatus);
r.get("/passengers", protectDriver, getPassengerBreakdown);

module.exports = r;
