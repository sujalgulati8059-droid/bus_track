const express = require("express");
const r = express.Router();
const {
  importStudents,
  listStudents,
  deleteStudent,
} = require("../controllers/adminStudentController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// All admin student management routes require admin or superadmin authentication
r.use(protect, restrictTo("admin", "superadmin"));

r.post("/import", importStudents);
r.get("/", listStudents);
r.delete("/:id", deleteStudent);

module.exports = r;
