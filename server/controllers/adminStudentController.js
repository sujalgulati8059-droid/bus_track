const StudentRecord = require("../models/StudentRecord");

/**
 * Helper to parse CSV lines into { uid, name } objects
 */
function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header line if present
    if (i === 0 && line.toLowerCase().includes("uid") && line.toLowerCase().includes("name")) {
      continue;
    }
    const parts = line.split(",").map(p => p.trim());
    if (parts.length >= 2) {
      const uid = parts[0].toUpperCase();
      const name = parts.slice(1).join(",").replace(/^["']|["']$/g, "").trim();
      if (uid && name) {
        results.push({ uid, name });
      }
    }
  }
  return results;
}

// POST /api/admin/students/import (JSON array or CSV: uid,name)
exports.importStudents = async (req, res, next) => {
  try {
    let students = [];

    if (Array.isArray(req.body)) {
      students = req.body;
    } else if (Array.isArray(req.body?.students)) {
      students = req.body.students;
    } else if (typeof req.body?.csv === "string") {
      students = parseCsv(req.body.csv);
    } else if (typeof req.body === "string") {
      students = parseCsv(req.body);
    }

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide a JSON array of students [{ uid, name }] or a CSV string",
      });
    }

    const validStudents = [];
    for (const s of students) {
      const uid = String(s.uid || "").trim().toUpperCase();
      const name = String(s.name || "").trim();
      if (uid && name) {
        validStudents.push({ uid, name, isActive: s.isActive !== false });
      }
    }

    if (validStudents.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid student records with both uid and name found",
      });
    }

    const bulkOps = validStudents.map((item) => ({
      updateOne: {
        filter: { uid: item.uid },
        update: { $set: { uid: item.uid, name: item.name, isActive: item.isActive } },
        upsert: true,
      },
    }));

    await StudentRecord.bulkWrite(bulkOps);

    res.json({
      success: true,
      count: validStudents.length,
      message: `Successfully imported ${validStudents.length} student records`,
    });
  } catch (e) {
    next(e);
  }
};

// GET /api/admin/students
exports.listStudents = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = {};
    if (q) {
      filter.$or = [
        { uid: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const [total, students] = await Promise.all([
      StudentRecord.countDocuments(filter),
      StudentRecord.find(filter)
        .sort({ uid: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      count: total,
      page,
      pages: Math.ceil(total / limit),
      data: students,
    });
  } catch (e) {
    next(e);
  }
};

// DELETE /api/admin/students/:id
exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: id };
    } else {
      query = { uid: id.toUpperCase() };
    }

    const record = await StudentRecord.findOneAndDelete(query);
    if (!record) {
      return res.status(404).json({ success: false, error: "Student record not found" });
    }

    res.json({
      success: true,
      message: `Student record ${record.uid} (${record.name}) deleted`,
    });
  } catch (e) {
    next(e);
  }
};
