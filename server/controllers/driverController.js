const jwt = require("jsonwebtoken");
const Driver = require("../models/Driver"), User = require("../models/User"), Route = require("../models/Route"), BusStatus = require("../models/BusStatus"), DailyTravelStatus = require("../models/DailyTravelStatus"), DriverRequest = require("../models/DriverRequest"), { sendDriverTokenResponse } = require("../services/authService"), { notifyRouteStatus, notifyAdminNewDriverRequest } = require("../services/pushService");
const { normalizePhone, generateAndSendOtp, verifyOtp } = require("../services/otpService");
const admin = require("../config/firebase");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const todayStr=()=>new Date().toISOString().slice(0,10);
const todayDay=()=>DAYS[new Date().getDay()];

exports.login=async(req,res,next)=>{try{const{phone,password}=req.body;if(!phone||!password)return res.status(400).json({success:false,error:"Phone number and password required"});const normalized=normalizePhone(phone);const driver=await Driver.findOne({phone:{$in:[normalized,String(phone).trim()]}}).select("+password");if(!driver||!(await driver.comparePassword(password)))return res.status(401).json({success:false,error:"Invalid phone number or password"});if(driver.status==="pending")return res.status(403).json({success:false,error:"Your request is waiting for admin approval. Please try again later."});if(driver.status==="rejected")return res.status(403).json({success:false,error:"Your request was rejected"+(driver.rejectReason?": "+driver.rejectReason:".")+" Contact the transport office."});if(!driver.isActive)return res.status(403).json({success:false,error:"Your account is deactivated. Contact the transport office."});driver.lastLogin=new Date();await driver.save({validateBeforeSave:false});sendDriverTokenResponse(driver,200,res);}catch(e){next(e);}};

exports.register=async(req,res,next)=>{try{
  const name=String(req.body.name||"").trim(),phone=String(req.body.phone||"").trim(),password=String(req.body.password||""),routeNo=String(req.body.routeNo||"").trim(),vehicleNo=String(req.body.vehicleNo||"").trim();
  if(name.length<2)return res.status(400).json({success:false,error:"Enter your full name"});
  if(!/^\d{10}$/.test(phone))return res.status(400).json({success:false,error:"Enter a valid 10-digit phone number"});
  if(password.length<6)return res.status(400).json({success:false,error:"Password must be at least 6 characters"});
  if(!routeNo||routeNo.endsWith("-R"))return res.status(400).json({success:false,error:"Select the route you drive"});
  const route=await Route.findOne({routeNo});if(!route)return res.status(400).json({success:false,error:"That route does not exist"});
  const existing=await Driver.findOne({phone});
  if(existing){
    if(existing.status==="pending")return res.status(400).json({success:false,error:"A request with this phone number is already waiting for approval"});
    if(existing.status!=="rejected")return res.status(400).json({success:false,error:"This phone number is already registered. Please log in."});
    existing.name=name;existing.password=password;existing.routeNo=routeNo;existing.vehicleNo=vehicleNo||undefined;existing.status="pending";existing.rejectReason=undefined;existing.reviewedAt=undefined;existing.isActive=true;await existing.save();
  }else{
    await Driver.create({name,phone,password,routeNo,vehicleNo:vehicleNo||undefined,status:"pending"});
  }
  req.app.get("io")?.emit("driver-request",{routeNo});
  res.status(201).json({success:true,message:"Request sent. You can log in once the admin approves it."});
}catch(e){next(e);}};

exports.logout=(req,res)=>{res.cookie("driverJwt","loggedout",{expires:new Date(Date.now()+5000),httpOnly:true});res.json({success:true,message:"Logged out"});};

exports.getMe=async(req,res)=>{res.json({success:true,data:{driver:req.driver}});};

exports.getMyRoute=async(req,res,next)=>{try{const route=await Route.findOne({routeNo:req.driver.routeNo});if(!route)return res.status(404).json({success:false,error:"Assigned route not found"});const status=await BusStatus.findOne({routeNo:route.routeNo,date:todayStr()});const going=await DailyTravelStatus.countDocuments({routeNo:route.routeNo,date:todayStr(),going:true});res.json({success:true,data:{route,todayStatus:status?{isWorking:status.isWorking,reason:status.reason}:{isWorking:true,reason:""},today:todayDay(),passengers:{going,capacity:route.capacity,overCapacity:going>route.capacity}}});}catch(e){next(e);}};

exports.getPassengerBreakdown=async(req,res,next)=>{try{const route=await Route.findOne({routeNo:req.driver.routeNo});if(!route)return res.status(404).json({success:false,error:"Assigned route not found"});const rows=await DailyTravelStatus.aggregate([{$match:{routeNo:route.routeNo,date:todayStr(),going:true}},{$group:{_id:"$stop",count:{$sum:1}}}]);const byStop=new Map(rows.map(r=>[r._id,r.count]));const total=rows.reduce((a,r)=>a+r.count,0);const registeredRows=await User.aggregate([{$match:{assignedRoute:route.routeNo,isActive:{$ne:false}}},{$group:{_id:"$assignedStop",count:{$sum:1}}}]);const registeredByStop=new Map(registeredRows.map(r=>[r._id,r.count]));const registered=registeredRows.reduce((a,r)=>a+r.count,0);const stops=route.stops.map(stop=>({stop,count:byStop.get(stop)||0,registered:registeredByStop.get(stop)||0}));res.json({success:true,data:{total,registered,capacity:route.capacity,overCapacity:total>route.capacity,stops}});}catch(e){next(e);}};

exports.updateDaySchedule=async(req,res,next)=>{try{const day=req.params.day;if(!DAYS.includes(day))return res.status(400).json({success:false,error:"Invalid day, use Mon/Tue/Wed/Thu/Fri/Sat/Sun"});const{stops,departureTime,skip}=req.body;if(stops&&(!Array.isArray(stops)||stops.length<2))return res.status(400).json({success:false,error:"stops must be an array of 2+ items"});const route=await Route.findOne({routeNo:req.driver.routeNo});if(!route)return res.status(404).json({success:false,error:"Assigned route not found"});route.schedule=route.schedule||{};route.schedule[day]={stops:stops||route.schedule?.[day]?.stops||[],departureTime:departureTime||route.schedule?.[day]?.departureTime||null,skip:typeof skip==="boolean"?skip:!!route.schedule?.[day]?.skip};route.markModified("schedule");await route.save();res.json({success:true,data:route});}catch(e){next(e);}};

exports.setTodayStatus=async(req,res,next)=>{try{const{isWorking,reason}=req.body;if(typeof isWorking!=="boolean")return res.status(400).json({success:false,error:"isWorking (boolean) required"});const status=await BusStatus.findOneAndUpdate({routeNo:req.driver.routeNo,date:todayStr()},{isWorking,reason:reason||"",driver:req.driver._id},{upsert:true,new:true,setDefaultsOnInsert:true});notifyRouteStatus(req.driver.routeNo,{isWorking,reason}).catch(()=>{});req.app.get("io")?.emit("driver-status-change",{routeNo:req.driver.routeNo,driverName:req.driver.name,isWorking,reason:reason||""});res.json({success:true,data:status});}catch(e){next(e);}};

// POST /api/driver/trip/start - starts trip and activates live status
exports.startTrip = async (req, res, next) => {
  try {
    const api = req.app.get("tracking");
    if (!api) return res.status(503).json({ success: false, error: "Tracking system unavailable" });
    const result = await api.startTrip(req.driver.routeNo, req.driver._id);
    res.json({ success: true, message: "Trip started", routeNo: req.driver.routeNo, startedAt: result.startedAt });
  } catch (e) {
    next(e);
  }
};

// POST /api/driver/trip/stop - stops trip and deactivates live status immediately
exports.stopTrip = async (req, res, next) => {
  try {
    const api = req.app.get("tracking");
    if (!api) return res.status(503).json({ success: false, error: "Tracking system unavailable" });
    await api.stopTrip(req.driver.routeNo, req.driver._id);
    res.json({ success: true, message: "Trip stopped", routeNo: req.driver.routeNo });
  } catch (e) {
    next(e);
  }
};

// POST /api/driver/location { lat, lng, heading? } - used by the mobile app's background GPS task
// Route is ALWAYS taken from the authenticated driver's routeNo — never from request body!
// Location pings are accepted only while a trip is active.
exports.updateLocation = (req, res) => {
  const { lat, lng, heading, speed } = req.body || {};
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ success: false, error: "lat and lng (numbers) required" });
  }
  const api = req.app.get("tracking");
  if (!api) return res.status(503).json({ success: false, error: "Tracking service unavailable" });

  const result = api.applyLocation(req.driver.routeNo, { lat, lng, heading, speed });
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, applied: true });
};

exports.stopLocation = (req, res) => {
  req.app.get("tracking")?.stopLive(req.driver.routeNo);
  res.json({ success: true });
};

// POST /api/driver/auth/google { idToken }
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, error: "idToken required" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();
    if (!email) return res.status(400).json({ success: false, error: "Google account has no email" });

    const driver = await Driver.findOne({ email, isActive: true, status: "approved" });
    if (!driver) {
      return res.status(403).json({ success: false, error: "No approved driver account found for this Google account. Contact the transport office." });
    }

    driver.lastLogin = new Date();
    await driver.save({ validateBeforeSave: false });
    sendDriverTokenResponse(driver, 200, res);
  } catch (e) {
    if (e.code?.startsWith("auth/")) return res.status(401).json({ success: false, error: "Invalid or expired Google token" });
    next(e);
  }
};

// ==========================================
// DRIVER SIGNUP & APPROVAL FLOW (PHONE OTP)
// ==========================================

// POST /api/driver/signup/otp/send { phone }
exports.sendDriverSignupOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Phone number is required" });
    const normalized = normalizePhone(phone);

    const existingDriver = await Driver.findOne({
      phone: { $in: [normalized, String(phone).trim()] },
      isActive: true,
      status: "approved",
    });
    if (existingDriver) {
      return res.status(400).json({ success: false, error: "This phone number is already registered as an active driver. Please log in." });
    }

    const pending = await DriverRequest.findOne({ phone: normalized, status: "pending" });
    if (pending) {
      return res.status(400).json({ success: false, error: "A request with this phone number is already waiting for approval." });
    }

    const result = await generateAndSendOtp({ phone: normalized, purpose: "driver_signup" });
    res.json({
      success: true,
      message: result.message,
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.verifyDriverSignupOtp = async (req, res, next) => {
  try {
    const { name, phone, otp, requestedRoute } = req.body;
    if (!name || !phone || !otp || !requestedRoute) {
      return res.status(400).json({ success: false, error: "name, phone, otp, and requestedRoute are required" });
    }
    const trimmedName = String(name).trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, error: "Enter a valid full name (at least 2 characters)" });
    }
    const normalized = normalizePhone(phone);
    const routeNoClean = String(requestedRoute).trim().toUpperCase();
    const route = await Route.findOne({ routeNo: routeNoClean, isActive: true });
    if (!route) return res.status(400).json({ success: false, error: "That route does not exist" });

    const existingDriver = await Driver.findOne({
      phone: { $in: [normalized, String(phone).trim()] },
      isActive: true,
      status: "approved",
    });
    if (existingDriver) {
      return res.status(400).json({ success: false, error: "This phone number is already registered as an active driver. Please log in." });
    }
    const pending = await DriverRequest.findOne({ phone: normalized, status: "pending" });
    if (pending) {
      return res.status(400).json({ success: false, error: "A request with this phone number is already waiting for approval." });
    }

    await verifyOtp({ phone: normalized, purpose: "driver_signup", otp });
    const signupToken = jwt.sign(
      { phone: normalized, name: trimmedName, requestedRoute: route.routeNo, purpose: "driver_signup" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ success: true, signupToken });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
    res.status(400).json({ success: false, error: e.message });
  }
};

// POST /api/driver/signup/request { name, phone, otp, requestedRoute }
exports.submitDriverSignupRequest = async (req, res, next) => {
  try {
    const { signupToken, password } = req.body;
    if (typeof password !== "string") {
      return res.status(400).json({ success: false, error: "Password is required" });
    }
    if (password.length < 6) return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    let signup;
    if (signupToken) {
      try {
        signup = jwt.verify(signupToken, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ success: false, error: "Invalid or expired driver signup token" });
      }
      if (signup.purpose !== "driver_signup" || !signup.phone || !signup.name || !signup.requestedRoute) {
        return res.status(403).json({ success: false, error: "Invalid token purpose for driver signup" });
      }
    } else {
      const { name, phone, otp, requestedRoute } = req.body;
      if (!name || !phone || !otp || !requestedRoute) {
        return res.status(400).json({ success: false, error: "name, phone, otp, and requestedRoute are required" });
      }
      signup = {
        name: String(name).trim(),
        phone: normalizePhone(phone),
        requestedRoute: String(requestedRoute).trim().toUpperCase(),
      };
      signup.otp = otp;
    }
    const trimmedName = String(signup.name).trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, error: "Enter a valid full name (at least 2 characters)" });
    }
    const normalized = normalizePhone(signup.phone);
    const routeNoClean = String(signup.requestedRoute).trim().toUpperCase();
    const route = await Route.findOne({ routeNo: routeNoClean, isActive: true });
    if (!route) {
      return res.status(400).json({ success: false, error: "That route does not exist" });
    }

    // Block if phone already an active Driver or has a pending request
    const existingDriver = await Driver.findOne({
      phone: { $in: [normalized, String(phone).trim()] },
      isActive: true,
      status: "approved",
    });
    if (existingDriver) {
      return res.status(400).json({ success: false, error: "This phone number is already registered as an active driver. Please log in." });
    }
    const pending = await DriverRequest.findOne({ phone: normalized, status: "pending" });
    if (pending) {
      return res.status(400).json({ success: false, error: "A request with this phone number is already waiting for approval." });
    }

    if (!signupToken) await verifyOtp({ phone: normalized, purpose: "driver_signup", otp: signup.otp });

    const driverReq = await DriverRequest.create({
      name: trimmedName,
      phone: normalized,
      requestedRoute: route.routeNo,
      password,
      status: "pending",
      phoneVerified: true,
    });

    req.app.get("io")?.emit("driver-request", { routeNo: route.routeNo, name: trimmedName, phone: normalized });
    notifyAdminNewDriverRequest(driverReq).catch(() => {});

    res.status(201).json({ success: true, message: "Request sent to admin" });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
    res.status(400).json({ success: false, error: e.message });
  }
};

// GET /api/driver/signup/status?phone=
exports.getDriverSignupStatus = async (req, res, next) => {
  try {
    const rawPhone = req.query.phone;
    if (!rawPhone) return res.status(400).json({ success: false, error: "phone query parameter is required" });
    const normalized = normalizePhone(rawPhone);
    const request = await DriverRequest.findOne({ phone: normalized }).sort({ createdAt: -1 });
    if (!request) {
      const driver = await Driver.findOne({
        phone: { $in: [normalized, String(phone).trim()] },
        isActive: true,
        status: "approved",
      });
      if (driver) return res.json({ success: true, status: "approved" });
      return res.status(404).json({ success: false, error: "No driver request found for this phone number" });
    }
    res.json({
      success: true,
      status: request.status,
      ...(request.rejectReason ? { rejectReason: request.rejectReason } : {}),
    });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
    res.status(400).json({ success: false, error: e.message });
  }
};

// ==========================================
// DRIVER OTP LOGIN AND PASSWORD SETUP
// ==========================================

// POST /api/driver/login/otp/send { phone }
// Only if an ACTIVE approved Driver exists with that phone (otherwise "Not approved yet / no account")
exports.sendDriverLoginOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Phone number is required" });
    const normalized = normalizePhone(phone);

    const driver = await Driver.findOne({
      phone: { $in: [normalized, String(phone).trim()] },
      isActive: true,
      status: "approved",
    }).select("+password");
    if (!driver) {
      return res.status(400).json({ success: false, error: "Not approved yet / no account" });
    }

    const result = await generateAndSendOtp({ phone: normalized, purpose: "driver_login" });
    res.json({
      success: true,
      message: result.message,
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
    res.status(400).json({ success: false, error: e.message });
  }
};

// POST /api/driver/login/otp/verify { phone, otp }
exports.verifyDriverLoginOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    const normalized = normalizePhone(phone);

    await verifyOtp({ phone: normalized, purpose: "driver_login", otp });

    const driver = await Driver.findOne({
      phone: { $in: [normalized, String(phone).trim()] },
      isActive: true,
      status: "approved",
    }).select("+password");
    if (!driver) {
      return res.status(400).json({ success: false, error: "Not approved yet / no account" });
    }

    if (!driver.password) {
      const passwordSetupToken = jwt.sign(
        { id: driver._id, role: "driver", purpose: "driver_password_setup" },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
      return res.json({ success: true, requiresPasswordSetup: true, passwordSetupToken });
    }

    driver.lastLogin = new Date();
    await driver.save({ validateBeforeSave: false });
    sendDriverTokenResponse(driver, 200, res);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
    res.status(400).json({ success: false, error: e.message });
  }
};

exports.setupPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }
    let decoded;
    try {
      decoded = jwt.verify(req.body?.setupToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid or expired password setup token" });
    }
    if (decoded.purpose !== "driver_password_setup" || decoded.role !== "driver" || !decoded.id) {
      return res.status(403).json({ success: false, error: "Invalid token purpose for password setup" });
    }
    const driver = await Driver.findById(decoded.id).select("+password");
    if (!driver || !driver.isActive || driver.status !== "approved") {
      return res.status(404).json({ success: false, error: "Approved driver account not found" });
    }
    if (driver.password) {
      return res.status(409).json({ success: false, error: "A password is already set for this account" });
    }
    driver.password = password;
    driver.lastLogin = new Date();
    await driver.save();
    sendDriverTokenResponse(driver, 200, res);
  } catch (e) {
    next(e);
  }
};
