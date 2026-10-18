const jwt=require("jsonwebtoken");
const User=require("../models/User");
const Route=require("../models/Route");
const StudentRecord=require("../models/StudentRecord");
const {sendUserTokenResponse,signSignupToken}=require("../services/authService");
const {sendOtp,verifyOtp,normalizePhone}=require("../services/otpService");

const sendError=(res,error)=>res.status(error.statusCode||500).json({success:false,error:error.message||"Request failed"});
const normalizeUid=uid=>typeof uid==="string"?uid.trim().toUpperCase():"";
const tokenFromClaims=(phone,uid,uidVerified)=>jwt.sign({phone,purpose:"student_signup",uid,uidVerified},process.env.JWT_SECRET,{expiresIn:"15m"});

exports.sendSignupOtp=async(req,res,next)=>{
  try{
    const result=await sendOtp(req.body?.phone,"student_signup");
    const body={success:true,message:"OTP sent"};
    if(result.devOtp)body.devOtp=result.devOtp;
    res.json(body);
  }catch(error){if(error.statusCode)return sendError(res,error);next(error);}
};
exports.verifySignupOtp=async(req,res,next)=>{
  try{
    const phone=normalizePhone(req.body?.phone);
    if(!phone||!(await verifyOtp(phone,"student_signup",req.body?.otp)))return res.status(400).json({success:false,error:"Invalid or expired OTP"});
    const signupToken=signSignupToken(phone);
    res.json({success:true,signupToken,expiresIn:900});
  }catch(error){next(error);}
};
exports.verifyUid=async(req,res,next)=>{
  try{
    const uid=normalizeUid(req.body?.uid);
    if(!/^[A-Z0-9-]{3,40}$/.test(uid))return res.status(400).json({success:false,error:"Valid UID is required"});
    const record=await StudentRecord.findOne({uid,isActive:true}).lean();
    if(!record)return res.status(404).json({success:false,error:"UID not found or inactive"});
    if(await User.exists({uid}))return res.status(409).json({success:false,error:"UID is already registered"});
    const signupToken=tokenFromClaims(req.signup.phone,uid,true);
    res.json({success:true,verified:true,prefillName:record.name,signupToken,expiresIn:900});
  }catch(error){next(error);}
};
exports.completeSignup=async(req,res,next)=>{
  try{
    const{name,uid:bodyUid,assignedRoute,assignedStops}=req.body||{};
    const uid=req.signup.uid;
    if(!uid||normalizeUid(bodyUid)!==uid)return res.status(400).json({success:false,error:"UID must match the verified UID"});
    if(typeof name!=="string"||!name.trim()||name.trim().length>100)return res.status(400).json({success:false,error:"Valid name is required"});
    if(typeof assignedRoute!=="string"||!Array.isArray(assignedStops)||assignedStops.length<1||assignedStops.length>30||assignedStops.some(stop=>typeof stop!=="string"||!stop.trim()))
      return res.status(400).json({success:false,error:"A route and one or more valid stops are required"});
    const record=await StudentRecord.findOne({uid,isActive:true}).lean();
    if(!record)return res.status(400).json({success:false,error:"UID verification is no longer valid"});
    if(await User.exists({phone:req.signup.phone,role:"student"}))return res.status(409).json({success:false,error:"Phone number is already registered"});
    const route=await Route.findOne({routeNo:assignedRoute.trim().toUpperCase(),isActive:true});
    if(!route)return res.status(400).json({success:false,error:"Selected route does not exist"});
    const stops=[...new Set(assignedStops.map(stop=>stop.trim()))];
    if(stops.some(stop=>!route.stops.includes(stop)))return res.status(400).json({success:false,error:"One or more selected stops are not on that route"});
    if(await User.exists({uid}))return res.status(409).json({success:false,error:"UID is already registered"});
    const user=await User.create({name:name.trim(),uid,phone:req.signup.phone,role:"student",assignedRoute:route.routeNo,assignedStop:stops[0],assignedStops:stops});
    sendUserTokenResponse(user,201,res);
  }catch(error){
    if(error.code===11000)return res.status(409).json({success:false,error:"UID is already registered"});
    next(error);
  }
};
exports.sendLoginOtp=async(req,res,next)=>{
  try{
    const phone=normalizePhone(req.body?.phone);
    if(!phone)return res.status(400).json({success:false,error:"Enter a valid Indian mobile number"});
    const users=await User.find({phone,role:"student",isActive:true}).select("_id").limit(2);
    if(!users.length)return res.json({success:true,message:"If an account exists, an OTP has been sent"});
    const result=await sendOtp(phone,"student_login");
    const body={success:true,message:"If an account exists, an OTP has been sent"};
    if(result.devOtp)body.devOtp=result.devOtp;
    res.json(body);
  }catch(error){if(error.statusCode)return sendError(res,error);next(error);}
};
exports.verifyLoginOtp=async(req,res,next)=>{
  try{
    const phone=normalizePhone(req.body?.phone);
    if(!phone||!(await verifyOtp(phone,"student_login",req.body?.otp)))return res.status(401).json({success:false,error:"Invalid phone or OTP"});
    const users=await User.find({phone,role:"student",isActive:true}).limit(2);
    if(users.length!==1)return res.status(401).json({success:false,error:"Invalid phone or OTP"});
    const user=users[0];user.lastLogin=new Date();await user.save({validateBeforeSave:false});
    sendUserTokenResponse(user,200,res);
  }catch(error){next(error);}
};
