const Driver=require("../models/Driver"),Route=require("../models/Route"),BusStatus=require("../models/BusStatus"),DailyTravelStatus=require("../models/DailyTravelStatus"),{sendDriverTokenResponse}=require("../services/authService"),{notifyRouteStatus}=require("../services/pushService");
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const todayStr=()=>new Date().toISOString().slice(0,10);
const todayDay=()=>DAYS[new Date().getDay()];

exports.login=async(req,res,next)=>{try{const{phone,password}=req.body;if(!phone||!password)return res.status(400).json({success:false,error:"Phone and password required"});const driver=await Driver.findOne({phone}).select("+password");if(!driver||!driver.isActive||!(await driver.comparePassword(password)))return res.status(401).json({success:false,error:"Invalid phone or password"});driver.lastLogin=new Date();await driver.save({validateBeforeSave:false});sendDriverTokenResponse(driver,200,res);}catch(e){next(e);}};

exports.logout=(req,res)=>{res.cookie("driverJwt","loggedout",{expires:new Date(Date.now()+5000),httpOnly:true});res.json({success:true,message:"Logged out"});};

exports.getMe=async(req,res)=>{res.json({success:true,data:{driver:req.driver}});};

exports.getMyRoute=async(req,res,next)=>{try{const route=await Route.findOne({routeNo:req.driver.routeNo});if(!route)return res.status(404).json({success:false,error:"Assigned route not found"});const status=await BusStatus.findOne({routeNo:route.routeNo,date:todayStr()});const going=await DailyTravelStatus.countDocuments({routeNo:route.routeNo,date:todayStr(),going:true});res.json({success:true,data:{route,todayStatus:status?{isWorking:status.isWorking,reason:status.reason}:{isWorking:true,reason:""},today:todayDay(),passengers:{going,capacity:route.capacity,overCapacity:going>route.capacity}}});}catch(e){next(e);}};

exports.getPassengerBreakdown=async(req,res,next)=>{try{const route=await Route.findOne({routeNo:req.driver.routeNo});if(!route)return res.status(404).json({success:false,error:"Assigned route not found"});const rows=await DailyTravelStatus.aggregate([{$match:{routeNo:route.routeNo,date:todayStr(),going:true}},{$group:{_id:"$stop",count:{$sum:1}}}]);const byStop=new Map(rows.map(r=>[r._id,r.count]));const total=rows.reduce((a,r)=>a+r.count,0);const stops=route.stops.map(stop=>({stop,count:byStop.get(stop)||0}));res.json({success:true,data:{total,capacity:route.capacity,overCapacity:total>route.capacity,stops}});}catch(e){next(e);}};

exports.updateDaySchedule=async(req,res,next)=>{try{const day=req.params.day;if(!DAYS.includes(day))return res.status(400).json({success:false,error:"Invalid day, use Mon/Tue/Wed/Thu/Fri/Sat/Sun"});const{stops,departureTime,skip}=req.body;if(stops&&(!Array.isArray(stops)||stops.length<2))return res.status(400).json({success:false,error:"stops must be an array of 2+ items"});const route=await Route.findOne({routeNo:req.driver.routeNo});if(!route)return res.status(404).json({success:false,error:"Assigned route not found"});route.schedule=route.schedule||{};route.schedule[day]={stops:stops||route.schedule?.[day]?.stops||[],departureTime:departureTime||route.schedule?.[day]?.departureTime||null,skip:typeof skip==="boolean"?skip:!!route.schedule?.[day]?.skip};route.markModified("schedule");await route.save();res.json({success:true,data:route});}catch(e){next(e);}};

exports.setTodayStatus=async(req,res,next)=>{try{const{isWorking,reason}=req.body;if(typeof isWorking!=="boolean")return res.status(400).json({success:false,error:"isWorking (boolean) required"});const status=await BusStatus.findOneAndUpdate({routeNo:req.driver.routeNo,date:todayStr()},{isWorking,reason:reason||"",driver:req.driver._id},{upsert:true,new:true,setDefaultsOnInsert:true});notifyRouteStatus(req.driver.routeNo,{isWorking,reason}).catch(()=>{});req.app.get("io")?.emit("driver-status-change",{routeNo:req.driver.routeNo,driverName:req.driver.name,isWorking,reason:reason||""});res.json({success:true,data:status});}catch(e){next(e);}};

// POST /api/driver/location { lat, lng, heading? } - used by the mobile app's background GPS task
exports.updateLocation=(req,res)=>{
  const{lat,lng,heading}=req.body||{};
  if(typeof lat!=="number"||typeof lng!=="number"||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({success:false,error:"lat and lng (numbers) required"});
  const api=req.app.get("tracking");
  const ok=api?api.applyLocation(req.driver.routeNo,{lat,lng,heading}):false;
  res.json({success:true,applied:ok});
};
exports.stopLocation=(req,res)=>{req.app.get("tracking")?.stopLive(req.driver.routeNo);res.json({success:true});};
