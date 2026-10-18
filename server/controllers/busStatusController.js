const Route=require("../models/Route"),BusStatus=require("../models/BusStatus");
const todayStr=()=>new Date().toISOString().slice(0,10);

exports.getTodayStatus=async(req,res,next)=>{try{const date=req.query.date||todayStr();const[routes,statuses]=await Promise.all([Route.find({isActive:true},"routeNo routeName departureTime region").lean(),BusStatus.find({date}).lean()]);const map=new Map(statuses.map(s=>[s.routeNo,s]));const data=routes.map(r=>({routeNo:r.routeNo,routeName:r.routeName,region:r.region,departureTime:r.departureTime,isWorking:map.has(r.routeNo)?map.get(r.routeNo).isWorking:true,reason:map.get(r.routeNo)?.reason||""}));res.json({success:true,date,count:data.length,working:data.filter(d=>d.isWorking).length,data});}catch(e){next(e);}};

exports.getReliability=async(req,res,next)=>{try{const days=Math.min(Number(req.query.days)||30,180);const cutoff=new Date(Date.now()-days*864e5).toISOString().slice(0,10);const rows=await BusStatus.aggregate([{$match:{date:{$gte:cutoff}}},{$group:{_id:"$routeNo",offDays:{$sum:{$cond:["$isWorking",0,1]}},recordedDays:{$sum:1},lastOffDate:{$max:{$cond:["$isWorking",null,"$date"]}},lastOffReason:{$last:"$reason"}}},{$sort:{offDays:-1}}]);const routes=await Route.find({routeNo:{$in:rows.map(r=>r._id)}},"routeNo routeName").lean();const nameMap=new Map(routes.map(r=>[r.routeNo,r.routeName]));const data=rows.map(r=>({routeNo:r._id,routeName:nameMap.get(r._id)||"",offDays:r.offDays,recordedDays:r.recordedDays,offRate:r.recordedDays?Math.round((r.offDays/r.recordedDays)*100):0,lastOffDate:r.lastOffDate}));res.json({success:true,days,data});}catch(e){next(e);}};

// GET /api/bus-status/eta?route=&stop=
exports.getEta = async (req, res, next) => {
  try {
    const routeNo = String(req.query.route || req.query.routeNo || "").trim().toUpperCase();
    const stop = String(req.query.stop || "").trim();
    if (!routeNo || !stop) {
      return res.status(400).json({ success: false, error: "route and stop query parameters are required" });
    }
    const route = await Route.findOne({ routeNo, isActive: true });
    if (!route) {
      return res.status(404).json({ success: false, error: `Route ${routeNo} not found or inactive` });
    }
    const stopIndex = route.stops.findIndex((s) => s.toUpperCase() === stop.toUpperCase());
    if (stopIndex === -1) {
      return res.status(400).json({ success: false, error: `Stop '${stop}' is not on route ${routeNo}` });
    }
    const matchedStop = route.stops[stopIndex];
    const tracking = req.app.get("tracking");
    if (!tracking) {
      return res.status(503).json({ success: false, error: "Tracking system unavailable" });
    }
    const etaData = tracking.getEta(routeNo, matchedStop);
    res.json({
      success: true,
      routeNo,
      stop: matchedStop,
      ...etaData,
    });
  } catch (e) {
    next(e);
  }
};
