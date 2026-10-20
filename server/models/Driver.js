const mongoose = require("mongoose"), bcrypt = require("bcryptjs");
const s = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    password: { type: String, select: false },
    routeNo: { type: String, required: true, uppercase: true, trim: true },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    vehicleNo: { type: String, trim: true, uppercase: true, maxlength: 20 },
    station: { type: String, trim: true },
    startTime: { type: String, trim: true },
    parking: { type: String, trim: true },
    rejectReason: String,
    reviewedAt: Date,
    lastLogin: Date,
  },
  { timestamps: true }
);
s.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
s.methods.comparePassword = async function (p) {
  if (!this.password || typeof p !== "string") return false;
  // Normal case: bcrypt hash
  if (/^\$2[aby]\$/.test(this.password)) return bcrypt.compare(p, this.password);
  // Self-healing: drivers inserted by hand (Compass / insertMany) have a plain-text password.
  // Accept it once and re-save so it gets hashed properly from now on.
  if (this.password === p) {
    this.markModified("password");
    await this.save({ validateBeforeSave: false });
    return true;
  }
  return false;
};
module.exports = mongoose.model("Driver", s);
