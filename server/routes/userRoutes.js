const express = require("express");
const r = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  setTravelStatus,
  getTodayStatus,
  getRouteEstimate,
  sendSignupOtp,
  verifySignupOtp,
  verifyUid,
  completeSignup,
  sendLoginOtp,
  verifyLoginOtp,
  setupPassword,
} = require("../controllers/userController");
const { protectUser } = require("../middleware/authMiddleware");
const { otpIpLimiter, otpPhoneLimiter } = require("../services/otpService");

// Student OTP Signup Flow
r.post("/otp/send", otpIpLimiter, otpPhoneLimiter, sendSignupOtp);
r.post("/otp/verify", otpIpLimiter, otpPhoneLimiter, verifySignupOtp);
r.post("/uid/verify", otpIpLimiter, verifyUid);
r.post("/signup/complete", otpIpLimiter, completeSignup);

// Returning Student Phone OTP Login
r.post("/login/otp/send", otpIpLimiter, otpPhoneLimiter, sendLoginOtp);
r.post("/login/otp/verify", otpIpLimiter, otpPhoneLimiter, verifyLoginOtp);
r.post("/password/setup", otpIpLimiter, setupPassword);

// Existing Legacy Routes (Email & Password)
r.post("/register", register);
r.post("/login", login);
r.post("/logout", protectUser, logout);
r.get("/me", protectUser, getMe);
r.put("/profile", protectUser, updateProfile);
r.post("/travel-status", protectUser, setTravelStatus);
r.get("/travel-status/today", protectUser, getTodayStatus);
r.get("/travel-status/route/:routeNo", getRouteEstimate);

module.exports = r;
