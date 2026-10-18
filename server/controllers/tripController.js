const Trip=require("../models/Trip");
const Route=require("../models/Route");
const BusStatus=require("../models/BusStatus");
const day=()=>new Date().toISOString().slice(0,10);
exports.start=async(req,res,next)=>{
  let createdTrip,tracking;
  try{
    const driver=req.driver;
    if(!(await Route.exists({routeNo:driver.routeNo,isActive:true})))return res.status(404).json({success:false,error:"Assigned route not found"});
    tracking=req.app.get("tracking");
    if(!tracking)return res.status(503).json({success:false,error:"Tracking is not ready"});
    if(await Trip.exists({driver:driver._id,active:true}))return res.status(409).json({success:false,error:"Trip is already active"});
    const startedAt=new Date();
    const trip=await Trip.create({driver:driver._id,routeNo:driver.routeNo,active:true,startedAt});
    createdTrip=trip;
    if(!tracking.startTrip(driver.routeNo,driver._id)){
      await Trip.deleteOne({_id:trip._id});createdTrip=null;
      return res.status(404).json({success:false,error:"Assigned route is not available for tracking"});
    }
    await BusStatus.findOneAndUpdate({routeNo:driver.routeNo,date:day()},{$set:{driver:driver._id,live:false,startedAt}},{upsert:true,new:true,setDefaultsOnInsert:true});
    res.status(201).json({success:true,data:{trip}});
  }catch(error){
    if(createdTrip){
      try{await Trip.deleteOne({_id:createdTrip._id});tracking?.endTrip(req.driver.routeNo,req.driver._id);}
      catch(rollbackError){
        console.error("Trip startup rollback failed:",rollbackError.message);
        return res.status(500).json({success:false,error:"Trip startup failed and cleanup could not be confirmed"});
      }
    }
    if(error.code===11000)return res.status(409).json({success:false,error:"A trip is already active for this driver or route"});
    next(error);
  }
};
exports.stop=async(req,res,next)=>{
  try{
    const endedAt=new Date();
    const trip=await Trip.findOneAndUpdate({driver:req.driver._id,active:true},{$set:{active:false,endedAt}},{new:true});
    if(!trip)return res.status(404).json({success:false,error:"No active trip"});
    const tracking=req.app.get("tracking");
    tracking?.endTrip(trip.routeNo,req.driver._id);
    await BusStatus.findOneAndUpdate({routeNo:trip.routeNo,date:day()},{$set:{live:false}},{upsert:true});
    res.json({success:true,data:{trip}});
  }catch(error){next(error);}
};
