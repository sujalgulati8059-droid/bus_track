const express=require("express"),r=express.Router(),{listDrivers,createDriver,updateDriver,deleteDriver}=require("../controllers/adminDriverController"),{protect,restrictTo}=require("../middleware/authMiddleware");
r.use(protect,restrictTo("admin","superadmin"));
r.get("/",listDrivers);
r.post("/",createDriver);
r.put("/:id",updateDriver);
r.delete("/:id",deleteDriver);
module.exports=r;
