const mongoose = require("mongoose"), bcrypt = require("bcryptjs");
const s = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    uid: { type: String, required: true, unique: true, trim: true, uppercase: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    password: { type: String, select: false, minlength: 6 },
    role: { type: String, enum: ["student", "faculty"], default: "student" },
    assignedRoute: { type: String, required: true },
    assignedStop: { type: String, required: true },
    assignedStops: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);
s.index({ assignedRoute: 1 });
s.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
s.methods.comparePassword = async function (p) {
  if (!this.password) return false;
  return bcrypt.compare(p, this.password);
};
module.exports = mongoose.model("User", s);
