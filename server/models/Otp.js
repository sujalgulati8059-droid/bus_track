const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["student_signup", "driver_signup", "driver_login", "student_login"],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    resendAfter: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

otpSchema.index({ phone: 1, purpose: 1 });

const otpLogSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // MongoDB TTL index to auto-expire log entries after 1 hour
  },
});

otpLogSchema.index({ phone: 1, createdAt: -1 });

const Otp = mongoose.model("Otp", otpSchema);
const OtpLog = mongoose.model("OtpLog", otpLogSchema);

module.exports = { Otp, OtpLog };
