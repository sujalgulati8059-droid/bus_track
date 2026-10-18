const express=require("express"),r=express.Router();
const{register,login,logout,getMe,updateProfile,setTravelStatus,getTodayStatus,getRouteEstimate}=require("../controllers/userController");
const{protectUser}=require("../middleware/authMiddleware");
const signupToken=require("../middleware/signupTokenMiddleware");
const otpLimit=require("../middleware/otpRateLimit");
const otp=require("../controllers/userOtpController");

r.post("/register",register);
r.post("/login",login);
r.post("/otp/send",otpLimit,otp.sendSignupOtp);
r.post("/otp/verify",otpLimit,otp.verifySignupOtp);
r.post("/uid/verify",signupToken(false),otp.verifyUid);
r.post("/signup/complete",signupToken(true),otp.completeSignup);
r.post("/login/otp/send",otpLimit,otp.sendLoginOtp);
r.post("/login/otp/verify",otpLimit,otp.verifyLoginOtp);
r.post("/logout",protectUser,logout);
r.get("/me",protectUser,getMe);
r.put("/profile",protectUser,updateProfile);
r.post("/travel-status",protectUser,setTravelStatus);
r.get("/travel-status/today",protectUser,getTodayStatus);
r.get("/travel-status/route/:routeNo",getRouteEstimate); // read-only, used by driver/admin views too

module.exports=r;
