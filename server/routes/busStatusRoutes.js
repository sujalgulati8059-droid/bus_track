const express=require("express"),r=express.Router(),{getTodayStatus,getReliability,getEta}=require("../controllers/busStatusController"),{protect,restrictTo}=require("../middleware/authMiddleware");
r.get("/today",getTodayStatus);
r.get("/eta",getEta);
r.get("/reliability",protect,restrictTo("admin","superadmin"),getReliability);
module.exports=r;
