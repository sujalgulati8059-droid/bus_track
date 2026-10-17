const express=require("express"),r=express.Router(),{getRoutes,getStops,searchBuses,createRoute,updateRoute,deleteRoute,getAnalyticsData}=require("../controllers/routeController"),{protect,restrictTo}=require("../middleware/authMiddleware");
r.get("/routes",getRoutes);r.get("/stops",getStops);r.post("/search",searchBuses);r.get("/analytics",getAnalyticsData);
r.post("/routes",protect,restrictTo("admin","superadmin"),createRoute);
r.put("/routes/:id",protect,restrictTo("admin","superadmin"),updateRoute);
r.delete("/routes/:id",protect,restrictTo("admin","superadmin"),deleteRoute);
module.exports=r;