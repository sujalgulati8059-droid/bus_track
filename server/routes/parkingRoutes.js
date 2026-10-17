const express=require("express"),r=express.Router(),{getParkingLayout,initParking,assignSlot,updateSlotStatus,clearSlot}=require("../controllers/parkingController"),{protect,restrictTo}=require("../middleware/authMiddleware");
r.get("/",getParkingLayout);
r.post("/init",protect,restrictTo("admin","superadmin"),initParking);
r.post("/assign",protect,restrictTo("admin","superadmin"),assignSlot);
r.put("/:slotId/status",protect,restrictTo("admin","superadmin"),updateSlotStatus);
r.delete("/:slotId/clear",protect,restrictTo("admin","superadmin"),clearSlot);
module.exports=r;