const jwt = require("jsonwebtoken");
const User = require("../models/User"), Route = require("../models/Route"), DailyTravelStatus = require("../models/DailyTravelStatus"), StudentRecord = require("../models/StudentRecord"), { sendUserTokenResponse } = require("../services/authService");
const { normalizePhone, generateAndSendOtp, verifyOtp } = require("../services/otpService");

const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

function getSignupToken(req) {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }
  return req.body?.signupToken || req.query?.signupToken || null;
}

exports.register=async(req,res,next)=>{
  try{
    const{name,uid,email,phone,password,role,assignedRoute,assignedStop}=req.body;
    if(!name||!uid||!email||!phone||!password||!role||!assignedRoute||!assignedStop)
      return res.status(400).json({success:false,error:"All fields are required"});
    if(!["student","faculty"].includes(role))
      return res.status(400).json({success:false,error:"Role must be student or faculty"});
    const route=await Route.findOne({routeNo:assignedRoute.toUpperCase(),isActive:true});
    if(!route)return res.status(400).json({success:false,error:"Selected route does not exist"});
    if(!route.stops.includes(assignedStop))
      return res.status(400).json({success:false,error:"Selected stop is not on that route"});
    const user=await User.create({name,uid:uid.toUpperCase(),email:email.toLowerCase(),phone,password,role,assignedRoute:route.routeNo,assignedStop});
    sendUserTokenResponse(user,201,res);
  }catch(e){
    if(e.code===11000){const field=Object.keys(e.keyPattern||{})[0]||"field";return res.status(400).json({success:false,error:`That ${field} is already registered`});}
    next(e);
  }
};

exports.login=async(req,res,next)=>{
  try{
    const{email,password}=req.body;
    if(!email||!password)return res.status(400).json({success:false,error:"Email and password required"});
    const user=await User.findOne({email:email.toLowerCase()}).select("+password");
    if(!user||!user.isActive||!(await user.comparePassword(password)))
      return res.status(401).json({success:false,error:"Invalid email or password"});
    user.lastLogin=new Date();await user.save({validateBeforeSave:false});
    sendUserTokenResponse(user,200,res);
  }catch(e){next(e);}
};

exports.logout=(req,res)=>{res.cookie("userJwt","loggedout",{expires:new Date(Date.now()+5000),httpOnly:true});res.json({success:true,message:"Logged out"});};

exports.getMe=async(req,res,next)=>{try{res.json({success:true,data:{user:req.user}});}catch(e){next(e);}};

exports.updateProfile=async(req,res,next)=>{
  try{
    const{phone,assignedStop}=req.body;const updates={};
    if(phone)updates.phone=phone;
    if(assignedStop){
      const route=await Route.findOne({routeNo:req.user.assignedRoute});
      if(!route||!route.stops.includes(assignedStop))
        return res.status(400).json({success:false,error:"Stop is not on your assigned route"});
      updates.assignedStop=assignedStop;
    }
    const user=await User.findByIdAndUpdate(req.user._id,updates,{new:true,runValidators:true});
    res.json({success:true,data:{user}});
  }catch(e){next(e);}
};

// POST /api/student/travel-status  { going, stop? }  — upsert, one row per user per day
exports.setTravelStatus=async(req,res,next)=>{
  try{
    const{going,stop}=req.body;
    if(typeof going!=="boolean")return res.status(400).json({success:false,error:"'going' must be true or false"});
    const boardingStop=stop||req.user.assignedStop;
    if(going){
      const route=await Route.findOne({routeNo:req.user.assignedRoute});
      if(!route||!route.stops.includes(boardingStop))
        return res.status(400).json({success:false,error:"Boarding stop is not on your assigned route"});
    }
    const status=await DailyTravelStatus.findOneAndUpdate(
      {user:req.user._id,date:today()},
      {user:req.user._id,date:today(),routeNo:req.user.assignedRoute,stop:boardingStop,going,timestamp:new Date()},
      {upsert:true,new:true,runValidators:true}
    );
    const io=req.app.get("io");
    if(io)io.to(`route_${req.user.assignedRoute}`).emit("passenger-status-change",{routeNo:req.user.assignedRoute,stop:boardingStop,going});
    res.json({success:true,data:{status}});
  }catch(e){next(e);}
};

exports.getTodayStatus=async(req,res,next)=>{
  try{
    const status=await DailyTravelStatus.findOne({user:req.user._id,date:today()});
    res.json({success:true,data:{status:status||null}});
  }catch(e){next(e);}
};

// GET /api/student/travel-status/route/:routeNo — passenger estimate per stop, for today
exports.getRouteEstimate=async(req,res,next)=>{
  try{
    const routeNo=req.params.routeNo.toUpperCase();
    const rows=await DailyTravelStatus.aggregate([
      {$match:{routeNo,date:today(),going:true}},
      {$group:{_id:"$stop",count:{$sum:1}}}
    ]);
    const byStop=Object.fromEntries(rows.map(r=>[r._id,r.count]));
    const total=rows.reduce((a,r)=>a+r.count,0);
    res.json({success:true,data:{routeNo,total,byStop}});
  }catch(e){next(e);}
};

// ==========================================
// STUDENT OTP SIGNUP FLOW
// ==========================================

// Step A: POST /api/users/otp/send { phone }
exports.sendSignupOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }
    const normalized = normalizePhone(phone);
    const existing = await User.findOne({ phone: normalized, isActive: true });
    if (existing) {
      return res.status(400).json({ success: false, error: "This phone number is already registered. Please log in." });
    }
    const result = await generateAndSendOtp({ phone: normalized, purpose: "student_signup" });
    res.json({
      success: true,
      message: result.message,
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ success: false, error: e.message });
    }
    res.status(400).json({ success: false, error: e.message });
  }
};

// Step B: POST /api/users/otp/verify { phone, otp }
exports.verifySignupOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }
    const normalized = normalizePhone(phone);
    await verifyOtp({ phone: normalized, purpose: "student_signup", otp });
    const signupToken = jwt.sign(
      { phone: normalized, purpose: "student_signup" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({
      success: true,
      message: "Phone verified successfully",
      signupToken,
    });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ success: false, error: e.message });
    }
    res.status(400).json({ success: false, error: e.message });
  }
};

// Kept for backward compat but no longer required
exports.verifyUid = async (req, res) => {
  res.json({ success: true, verified: true, prefillName: '', signupToken: req.body.signupToken || '' });
};

// Step C: POST /api/users/uid/verify { uid } (requires signupToken)
exports.verifyUid = async (req, res, next) => {
  try {
    const token = getSignupToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Signup token required" });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid or expired signup token" });
    }
    if (decoded.purpose !== "student_signup") {
      return res.status(403).json({ success: false, error: "Invalid token purpose for student signup" });
    }

    const { uid } = req.body;
    if (!uid || typeof uid !== "string") {
      return res.status(400).json({ success: false, error: "UID is required" });
    }
    const uidClean = uid.trim().toUpperCase();

    // Check UID against StudentRecord
    const record = await StudentRecord.findOne({ uid: uidClean, isActive: true });
    if (!record) {
      return res.status(404).json({ success: false, error: "Student UID not found or not active in university records" });
    }

    // Reject if a User with that UID already exists
    const existing = await User.findOne({ uid: uidClean });
    if (existing) {
      return res.status(400).json({ success: false, error: "A user with this UID is already registered" });
    }

    // Issue updated signup token with uidVerified: true and prefillName
    const updatedSignupToken = jwt.sign(
      {
        phone: decoded.phone,
        uid: uidClean,
        prefillName: record.name,
        purpose: "student_signup",
        uidVerified: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      success: true,
      verified: true,
      prefillName: record.name,
      signupToken: updatedSignupToken,
    });
  } catch (e) {
    next(e);
  }
};

exports.completeSignup = async (req, res, next) => {
  try {
    const token = getSignupToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Signup token required" });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid or expired signup token" });
    }
    if (decoded.purpose !== "student_signup") {
      return res.status(403).json({ success: false, error: "Invalid token purpose" });
    }

    const phone = decoded.phone;
    const { name, assignedRoute, assignedStops, assignedStop, role } = req.body;
    const fullName = String(name || "").trim();
    if (!fullName) return res.status(400).json({ success: false, error: "Name is required" });
    if (!assignedRoute) return res.status(400).json({ success: false, error: "Assigned route is required" });

    const route = await Route.findOne({ routeNo: assignedRoute.toUpperCase(), isActive: true });
    if (!route) return res.status(400).json({ success: false, error: "Selected route does not exist" });

    let stops = [];
    if (Array.isArray(assignedStops) && assignedStops.length > 0) {
      stops = assignedStops.map(s => String(s).trim()).filter(Boolean);
    } else if (assignedStop) {
      stops = [String(assignedStop).trim()];
    }
    if (stops.length === 0) return res.status(400).json({ success: false, error: "At least one stop is required" });

    const invalidStops = stops.filter(s => !route.stops.includes(s));
    if (invalidStops.length > 0) return res.status(400).json({ success: false, error: `Stop(s) not on route: ${invalidStops.join(", ")}` });

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ success: false, error: "User with this phone is already registered" });

    const user = await User.create({
      name: fullName,
      phone,
      role: role && ["student", "faculty"].includes(role) ? role : "student",
      assignedRoute: route.routeNo,
      assignedStop: stops[0],
      assignedStops: stops,
      isActive: true,
    });

    sendUserTokenResponse(user, 201, res);
  } catch (e) {
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || "field";
      return res.status(400).json({ success: false, error: `That ${field} is already registered` });
    }
    next(e);
  }
};

// ==========================================
// RETURNING STUDENT PHONE OTP LOGIN
// ==========================================

// POST /api/users/login/otp/send { phone }
exports.sendLoginOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }
    const normalized = normalizePhone(phone);
    const user = await User.findOne({ phone: normalized, isActive: true });
    if (!user) {
      return res.status(404).json({ success: false, error: "No student account found with this phone number. Please sign up." });
    }
    const result = await generateAndSendOtp({ phone: normalized, purpose: "student_login" });
    res.json({
      success: true,
      message: result.message,
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ success: false, error: e.message });
    }
    res.status(400).json({ success: false, error: e.message });
  }
};

// POST /api/users/login/otp/verify { phone, otp }
exports.verifyLoginOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: "Phone and OTP are required" });
    }
    const normalized = normalizePhone(phone);
    await verifyOtp({ phone: normalized, purpose: "student_login", otp });
    const user = await User.findOne({ phone: normalized, isActive: true });
    if (!user) {
      return res.status(404).json({ success: false, error: "User account not found" });
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    sendUserTokenResponse(user, 200, res);
  } catch (e) {
    if (e.statusCode) {
      return res.status(e.statusCode).json({ success: false, error: e.message });
    }
    res.status(400).json({ success: false, error: e.message });
  }
};
