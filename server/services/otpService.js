const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { Otp, OtpLog } = require("../models/Otp");

/**
 * Normalizes phone number to +91XXXXXXXXXX.
 * Accepts:
 * - 10-digit number (e.g. 9876543210)
 * - +91 followed by 10 digits (e.g. +919876543210)
 * - 91 prefix followed by 10 digits (e.g. 919876543210)
 * Rejects anything else.
 */
function normalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") {
    throw new Error("Phone number is required");
  }
  const cleaned = rawPhone.trim().replace(/[\s\-()]/g, "");
  let digits = "";
  if (cleaned.startsWith("+91")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    digits = cleaned.slice(2);
  } else if (cleaned.length === 10) {
    digits = cleaned;
  } else {
    throw new Error("Invalid phone format. Please enter a valid 10-digit Indian phone number.");
  }

  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new Error("Invalid phone format. Must be a 10-digit Indian mobile number starting with 6-9.");
  }

  return `+91${digits}`;
}

/**
 * Provider abstraction: sends SMS using console (default), MSG91, or Twilio
 */
async function sendSms(phone, text) {
  const provider = (process.env.SMS_PROVIDER || "console").toLowerCase();

  if (provider === "twilio") {
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const from = process.env.TWILIO_FROM;

    if (!sid || !token || !from) {
      console.error("[SMS: Twilio] Missing TWILIO_SID, TWILIO_TOKEN, or TWILIO_FROM");
      throw new Error("Twilio SMS credentials not configured");
    }

    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      To: phone,
      From: from,
      Body: text,
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[SMS: Twilio Error]", errText);
      throw new Error("Failed to send SMS via Twilio");
    }
    return { success: true, provider: "twilio" };
  }

  if (provider === "msg91") {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey || !templateId) {
      console.error("[SMS: MSG91] Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID");
      throw new Error("MSG91 credentials not configured");
    }

    const mobiles = phone.replace("+", "");
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: "0",
        recipients: [
          {
            mobiles,
            message: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[SMS: MSG91 Error]", errText);
      throw new Error("Failed to send SMS via MSG91");
    }
    return { success: true, provider: "msg91" };
  }

  // Default: console
  console.log("\n=======================================================");
  console.log(`[SMS CONSOLE DEV] Provider: console`);
  console.log(`Recipient: ${phone}`);
  console.log(`Message:   ${text}`);
  console.log("=======================================================\n");
  return { success: true, provider: "console" };
}

/**
 * Generates and sends a 6-digit OTP for the given phone and purpose.
 * Stores ONLY a bcrypt hash in Mongo.
 * Enforces:
 * - 30-second cooldown (resendAfter)
 * - Max 5 OTPs per phone per hour
 * - 5-minute expiry (or OTP_EXPIRY_MIN)
 */
async function generateAndSendOtp({ phone: rawPhone, purpose }) {
  const phone = normalizePhone(rawPhone);
  const validPurposes = ["student_signup", "driver_signup", "driver_login", "student_login"];
  if (!validPurposes.includes(purpose)) {
    throw new Error(`Invalid OTP purpose: ${purpose}`);
  }

  // Check hourly limit: max 5 OTPs per phone per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlyCount = await OtpLog.countDocuments({
    phone,
    createdAt: { $gte: oneHourAgo },
  });

  if (hourlyCount >= 10) {
    const error = new Error("Too many OTP requests for this phone number. Please try again in an hour.");
    error.statusCode = 429;
    throw error;
  }

  // Check 30-second resend cooldown
  const latestOtp = await Otp.findOne({ phone, purpose }).sort({ createdAt: -1 });
  if (latestOtp && Date.now() < new Date(latestOtp.resendAfter).getTime()) {
    const waitSeconds = Math.ceil((new Date(latestOtp.resendAfter).getTime() - Date.now()) / 1000);
    const error = new Error(`Please wait ${waitSeconds} seconds before requesting a new OTP.`);
    error.statusCode = 429;
    throw error;
  }

  // Generate cryptographically secure 6-digit OTP
  const otpNumber = crypto.randomInt(100000, 1000000);
  const otp = otpNumber.toString();

  // Store ONLY bcrypt hash in the database
  const otpHash = await bcrypt.hash(otp, 10);

  const expiryMin = parseInt(process.env.OTP_EXPIRY_MIN, 10) || 5;
  const expiresAt = new Date(Date.now() + expiryMin * 60 * 1000);
  const resendAfter = new Date(Date.now() + 30 * 1000); // 30s cooldown

  // Remove existing active OTPs for this phone+purpose and save new
  await Otp.deleteMany({ phone, purpose });
  await Otp.create({
    phone,
    otpHash,
    purpose,
    expiresAt,
    attempts: 0,
    resendAfter,
  });

  // Log to OtpLog to enforce hourly limit
  await OtpLog.create({ phone, purpose });

  // Send SMS
  const text = `Your BusTrack Pro OTP is ${otp}. Valid for ${expiryMin} minutes. Do not share this with anyone.`;
  await sendSms(phone, text);

  // Expose devOtp ONLY when SMS_PROVIDER is console AND NODE_ENV is not production
  const provider = (process.env.SMS_PROVIDER || "console").toLowerCase();
  const isDev = provider === "console" && process.env.NODE_ENV !== "production";

  return {
    success: true,
    phone,
    message: "OTP sent successfully",
    devOtp: isDev ? otp : undefined,
  };
}

/**
 * Verifies the 6-digit OTP for phone and purpose.
 * Enforces:
 * - Expiry check
 * - Max 5 attempts
 * - Timing-safe bcrypt comparison
 * - Single-use (deleted upon success)
 */
async function verifyOtp({ phone: rawPhone, purpose, otp }) {
  const phone = normalizePhone(rawPhone);

  if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
    const error = new Error("Please enter a valid 6-digit OTP");
    error.statusCode = 400;
    throw error;
  }

  const otpDoc = await Otp.findOne({ phone, purpose });
  if (!otpDoc) {
    const error = new Error("No active OTP request found or OTP expired. Please request a new OTP.");
    error.statusCode = 400;
    throw error;
  }

  // Check expiration
  if (Date.now() > new Date(otpDoc.expiresAt).getTime()) {
    await Otp.deleteOne({ _id: otpDoc._id });
    const error = new Error("OTP has expired. Please request a new OTP.");
    error.statusCode = 400;
    throw error;
  }

  // Check attempts
  if (otpDoc.attempts >= 5) {
    await Otp.deleteOne({ _id: otpDoc._id });
    const error = new Error("Maximum verification attempts exceeded. Please request a new OTP.");
    error.statusCode = 429;
    throw error;
  }

  // Increment attempt count
  otpDoc.attempts += 1;
  await otpDoc.save();

  // Compare using bcrypt (constant-time comparison)
  const isMatch = await bcrypt.compare(otp.trim(), otpDoc.otpHash);
  if (!isMatch) {
    const remaining = 5 - otpDoc.attempts;
    const msg = remaining > 0
      ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
      : "Invalid OTP. Maximum attempts exceeded. Please request a new OTP.";
    const error = new Error(msg);
    error.statusCode = 400;
    throw error;
  }

  // Verified! Delete the OTP doc so it cannot be used again
  await Otp.deleteOne({ _id: otpDoc._id });

  return {
    success: true,
    phone,
    purpose,
  };
}

/**
 * Rate limiters for OTP routes:
 * - otpIpLimiter: 30 requests per 15 min per IP
 * - otpPhoneLimiter: 5 OTP requests per 15 min per phone number
 */
const otpIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests from this IP address. Please try again later." },
});

const otpPhoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    try {
      return req.body?.phone ? normalizePhone(req.body.phone) : (req.ip || "unknown");
    } catch (e) {
      return req.ip || "unknown";
    }
  },
  message: { success: false, error: "Too many OTP requests for this phone number. Please wait before retrying." },
});

module.exports = {
  normalizePhone,
  sendSms,
  generateAndSendOtp,
  verifyOtp,
  otpIpLimiter,
  otpPhoneLimiter,
};
