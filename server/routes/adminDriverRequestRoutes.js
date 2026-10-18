const express=require("express"),r=express.Router();
const{protect,restrictTo}=require("../middleware/authMiddleware");
const controller=require("../controllers/adminDriverRequestController");
r.use(protect,restrictTo("admin","superadmin"));
r.get("/",controller.listRequests);
r.post("/:id/approve",controller.approveRequest);
r.post("/:id/reject",controller.rejectRequest);
module.exports=r;
