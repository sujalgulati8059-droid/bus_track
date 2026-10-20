// One-time repair for driver logins that always say "invalid".
//   node config/fixDriverPasswords.js            -> repair only broken drivers
//   node config/fixDriverPasswords.js --reset    -> ALSO reset every driver's password to Pass@123
//
// What it fixes:
//  1. drivers with NO password, or a plain-text password (inserted by hand) -> proper bcrypt hash
//  2. drivers missing isActive / status fields (inserted by hand)           -> active + approved
//  3. phone numbers saved as 10 digits                                      -> +91XXXXXXXXXX (same as seed)
//  4. old app sign-ups that were saved as pending Drivers                   -> moved to the website's Driver Requests tab
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DEFAULT_PASSWORD = "Pass@123";
const isBcrypt = (v) => typeof v === "string" && /^\$2[aby]\$/.test(v);

(async () => {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI missing in .env"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  const drivers = mongoose.connection.collection("drivers");
  const requests = mongoose.connection.collection("driverrequests");
  const reset = process.argv.includes("--reset");

  let hashed = 0, activated = 0, phones = 0, moved = 0;
  const all = await drivers.find({}).toArray();

  for (const d of all) {
    // 4. legacy pending sign-ups -> DriverRequest
    if (d.status === "pending") {
      const phone = String(d.phone || "").replace(/\D/g, "").slice(-10);
      if (phone.length === 10 && d.password) {
        const dup = await requests.findOne({ phone: `+91${phone}`, status: "pending" });
        if (!dup) {
          await requests.insertOne({
            name: d.name, phone: `+91${phone}`, password: isBcrypt(d.password) ? d.password : await bcrypt.hash(d.password, 12),
            requestedRoute: String(d.routeNo || "").toUpperCase(), vehicleNo: d.vehicleNo,
            status: "pending", phoneVerified: false, createdAt: d.createdAt || new Date(), updatedAt: new Date(),
          });
          await drivers.deleteOne({ _id: d._id });
          moved++;
          continue;
        }
      }
    }

    const $set = {};
    if (reset || !d.password) $set.password = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    else if (!isBcrypt(d.password)) $set.password = await bcrypt.hash(String(d.password), 12);
    if ($set.password) hashed++;

    if (d.isActive === undefined || d.isActive === null) { $set.isActive = true; activated++; }
    if (!d.status) $set.status = "approved";

    const digits = String(d.phone || "").replace(/\D/g, "");
    if (digits.length === 10 || (digits.length === 12 && digits.startsWith("91"))) {
      const norm = `+91${digits.slice(-10)}`;
      if (d.phone !== norm && !(await drivers.findOne({ phone: norm, _id: { $ne: d._id } }))) { $set.phone = norm; phones++; }
    }
    if (Object.keys($set).length) await drivers.updateOne({ _id: d._id }, { $set });
  }

  console.log(`Drivers checked: ${all.length}`);
  console.log(`Passwords fixed/hashed: ${hashed}${reset ? " (all reset to " + DEFAULT_PASSWORD + ")" : ""}`);
  console.log(`Marked active: ${activated} | Phones normalised: ${phones} | Pending sign-ups moved to Driver Requests: ${moved}`);
  if (hashed && !reset) console.log(`Drivers that had no password now use: ${DEFAULT_PASSWORD}`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
