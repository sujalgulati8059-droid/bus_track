const express=require("express"),r=express.Router();
const{register,login,logout,getMe,updateProfile,setTravelStatus,getTodayStatus,getRouteEstimate}=require("../controllers/userController");
const{protectUser}=require("../middleware/authMiddleware");

r.post("/register",register);
r.post("/login",login);
r.post("/logout",protectUser,logout);
r.get("/me",protectUser,getMe);
r.put("/profile",protectUser,updateProfile);
r.post("/travel-status",protectUser,setTravelStatus);
r.get("/travel-status/today",protectUser,getTodayStatus);
r.get("/travel-status/route/:routeNo",getRouteEstimate); // read-only, used by driver/admin views too

module.exports=r;
