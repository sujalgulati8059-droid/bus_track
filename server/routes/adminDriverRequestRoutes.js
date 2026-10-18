const express = require("express");
const r = express.Router();
const {
  listDriverRequests,
  approveDriverRequest,
  rejectDriverRequest,
} = require("../controllers/adminDriverRequestController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// Admin authentication required
r.use(protect, restrictTo("admin", "superadmin"));

// GET /api/admin/driver-requests?status=pending
r.get("/", listDriverRequests);

// POST & PUT /api/admin/driver-requests/:id/approve
r.post("/:id/approve", approveDriverRequest);
r.put("/:id/approve", approveDriverRequest);

// POST & PUT /api/admin/driver-requests/:id/reject
r.post("/:id/reject", rejectDriverRequest);
r.put("/:id/reject", rejectDriverRequest);

module.exports = r;
