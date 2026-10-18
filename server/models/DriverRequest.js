const mongoose = require("mongoose"), bcrypt = require("bcryptjs");

const driverRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
      minlength: 6,
    },
    requestedRoute: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectReason: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    reviewedAt: {
      type: Date,
    },
    phoneVerified: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

driverRequestSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Unique phone while status is "pending"
driverRequestSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

module.exports = mongoose.model("DriverRequest", driverRequestSchema);
