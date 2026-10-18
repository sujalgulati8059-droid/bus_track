require("dotenv").config();
const mongoose = require("mongoose"), StudentRecord = require("../models/StudentRecord");

const testStudents = [
  { uid: "21BCS1001", name: "Aarav Sharma" },
  { uid: "21BCS1002", name: "Diya Patel" },
  { uid: "21BCS1003", name: "Rohan Verma" },
  { uid: "21BCS1004", name: "Ananya Singh" },
  { uid: "21BCS1005", name: "Vikram Malhotra" },
  { uid: "21BCS1006", name: "Pooja Gupta" },
  { uid: "21BCS1007", name: "Kabir Mehta" },
  { uid: "21BCS1008", name: "Sneha Reddy" },
  { uid: "21BCS1009", name: "Arjun Nair" },
  { uid: "21BCS1010", name: "Kritika Joshi" },
];

async function seedStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const ops = testStudents.map((s) => ({
      updateOne: {
        filter: { uid: s.uid },
        update: { $set: { uid: s.uid, name: s.name, isActive: true } },
        upsert: true,
      },
    }));
    await StudentRecord.bulkWrite(ops);
    console.log(`✅ Seeded ${testStudents.length} student records into StudentRecord`);
    process.exit(0);
  } catch (e) {
    console.error("❌ Seed students failed:", e.message);
    process.exit(1);
  }
}

seedStudents();
