const DriverRequest = require("../models/DriverRequest");
const Driver = require("../models/Driver");
const Route = require("../models/Route");

// GET /api/admin/driver-requests?status=pending
exports.listDriverRequests = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const requests = await DriverRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email")
      .lean();

    res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (e) {
    next(e);
  }
};

// POST /api/admin/driver-requests/:id/approve
// Body: { routeNo? } (Admin may override the requested route)
exports.approveDriverRequest = async (req, res, next) => {
  try {
    const request = await DriverRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Driver request not found" });
    }
    if (request.status === "approved") {
      return res.status(400).json({ success: false, error: "This request has already been approved" });
    }

    const routeNo = String(req.body?.routeNo || request.requestedRoute).trim().toUpperCase();
    const route = await Route.findOne({ routeNo, isActive: true });
    if (!route) {
      return res.status(400).json({ success: false, error: `Route ${routeNo} does not exist or is inactive` });
    }

    // Create or reactivate the Driver (name, phone, routeNo=requestedRoute, isActive:true, no password needed)
    // One route can have several drivers (substitute/shift) — do not block multiple drivers per route!
    let driver = await Driver.findOne({ phone: request.phone });
    if (driver) {
      driver.name = request.name;
      driver.routeNo = route.routeNo;
      driver.isActive = true;
      driver.status = "approved";
      driver.rejectReason = undefined;
      driver.reviewedAt = new Date();
      await driver.save({ validateBeforeSave: false });
    } else {
      driver = await Driver.create({
        name: request.name,
        phone: request.phone,
        routeNo: route.routeNo,
        isActive: true,
        status: "approved",
        reviewedAt: new Date(),
      });
    }

    request.status = "approved";
    request.requestedRoute = route.routeNo;
    request.reviewedBy = req.admin._id;
    request.reviewedAt = new Date();
    await request.save();

    req.app.get("io")?.emit("driver-approved", {
      phone: request.phone,
      driverName: request.name,
      routeNo: route.routeNo,
    });

    res.json({
      success: true,
      message: "Driver request approved and driver account created",
      data: { driver, request },
    });
  } catch (e) {
    next(e);
  }
};

// POST /api/admin/driver-requests/:id/reject
// Body: { reason }
exports.rejectDriverRequest = async (req, res, next) => {
  try {
    const request = await DriverRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Driver request not found" });
    }

    const reason = String(req.body?.reason || "").trim() || "Rejected by administrator";
    request.status = "rejected";
    request.rejectReason = reason;
    request.reviewedBy = req.admin._id;
    request.reviewedAt = new Date();
    await request.save();

    res.json({
      success: true,
      message: "Driver request rejected",
      data: { request },
    });
  } catch (e) {
    next(e);
  }
};
