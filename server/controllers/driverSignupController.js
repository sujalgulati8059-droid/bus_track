const Driver=require("../models/Driver");
const DriverRequest=require("../models/DriverRequest");
const Route=require("../models/Route");
const {sendDriverTokenResponse}=require("../services/authService");
const {sendOtp,verifyOtp,normalizePhone}=require("../services/otpService");

const errorResponse=(res,error)=>res.status(error.statusCode||500).json({success:false,error:error.message||"Request failed"});
exports.sendSignupOtp=async(req,res,next)=>{
  try{
    const result=await sendOtp(req.body?.phone,"driver_signup");
    const body={success:true,message:"OTP sent"};
    if(result.devOtp)body.devOtp=result.devOtp;
    res.json(body);
  }catch(error){if(error.statusCode)return errorResponse(res,error);next(error);}
};
exports.submitRequest=async(req,res,next)=>{
  try{
    const{name,phone:rawPhone,otp,requestedRoute}=req.body||{};
    const phone=normalizePhone(rawPhone);
    if(typeof name!=="string"||!name.trim()||name.trim().length>100||!phone||typeof otp!=="string"||!/^\d{6}$/.test(otp)||typeof requestedRoute!=="string")
      return res.status(400).json({success:false,error:"Valid name, phone, OTP and requestedRoute are required"});
    const route=await Route.findOne({routeNo:requestedRoute.trim().toUpperCase(),isActive:true});
    if(!route)return res.status(400).json({success:false,error:"Selected route does not exist"});
    if(!(await verifyOtp(phone,"driver_signup",otp)))return res.status(400).json({success:false,error:"Invalid or expired OTP"});
    if(await Driver.exists({phone,isActive:true})||await DriverRequest.exists({phone,status:"pending"}))
      return res.status(409).json({success:false,error:"An active driver account or pending request already exists"});
    await DriverRequest.create({name:name.trim(),phone,requestedRoute:route.routeNo,status:"pending",phoneVerified:true});
    res.status(201).json({success:true,message:"Request sent to admin"});
  }catch(error){
    if(error.code===11000)return res.status(409).json({success:false,error:"A pending request already exists for this phone"});
    next(error);
  }
};
exports.getRequestStatus=async(req,res,next)=>{
  try{
    const phone=normalizePhone(req.query.phone);
    if(!phone)return res.status(400).json({success:false,error:"Enter a valid Indian mobile number"});
    const request=await DriverRequest.findOne({phone}).sort({createdAt:-1}).select("status rejectReason").lean();
    const driver=await Driver.findOne({phone,isActive:true}).select("_id").lean();
    const status=request?.status==="approved"||driver?"approved":request?.status||"not_found";
    res.json({success:true,status,...(status==="rejected"?{rejectReason:request.rejectReason}:{})});
  }catch(error){next(error);}
};
exports.sendLoginOtp=async(req,res,next)=>{
  try{
    const phone=normalizePhone(req.body?.phone);
    if(!phone)return res.status(400).json({success:false,error:"Enter a valid Indian mobile number"});
    const driver=await Driver.findOne({phone,isActive:true}).select("_id");
    if(!driver)return res.status(403).json({success:false,error:"Not approved yet / no account"});
    const result=await sendOtp(phone,"driver_login");
    const body={success:true,message:"OTP sent"};
    if(result.devOtp)body.devOtp=result.devOtp;
    res.json(body);
  }catch(error){if(error.statusCode)return errorResponse(res,error);next(error);}
};
exports.verifyLoginOtp=async(req,res,next)=>{
  try{
    const phone=normalizePhone(req.body?.phone);
    if(!phone||!(await verifyOtp(phone,"driver_login",req.body?.otp)))return res.status(401).json({success:false,error:"Invalid phone or OTP"});
    const driver=await Driver.findOne({phone,isActive:true});
    if(!driver)return res.status(401).json({success:false,error:"Invalid phone or OTP"});
    driver.lastLogin=new Date();await driver.save({validateBeforeSave:false});
    sendDriverTokenResponse(driver,200,res);
  }catch(error){next(error);}
};
