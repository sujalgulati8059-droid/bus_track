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
  if (!this.password) return false;
  return bcrypt.compare(p, this.password);
};
module.exports = mongoose.model("Driver", s);
