const jwt=require("jsonwebtoken");
const Route=require("../models/Route");
const Driver=require("../models/Driver");
const Trip=require("../models/Trip");
const BusStatus=require("../models/BusStatus");
const {notifyBusNear}=require("../services/pushService");

const CU=[30.7735,76.5763];
const GPS={"CU":[30.7735,76.5763],"KHARAR BUS STAND":[30.7462,76.6450],"SUNNY ENCLAVE":[30.7310,76.6220],"NAV CITY":[30.7280,76.6180],"KFC":[30.7350,76.6280],"DERABASSI BUS STAND":[30.6020,76.8030],"PHASE 7 MARKET":[30.7050,76.7140],"PHASE 5 GURUDWARA":[30.7100,76.7100],"CITY HEART":[30.7060,76.7160],"SEC 17 BUS STAND":[30.7404,76.7878],"SOHANA":[30.7160,76.6890],"SOHANA BUS STAND":[30.7160,76.6890],"LANDRAN":[30.8001,76.5901],"KURALI BUS STAND":[30.8180,76.5720],"MANSA DEVI":[30.7560,76.8100],"IT PARK":[30.7300,76.8050],"MANIMAJRA":[30.7260,76.8420],"AIRPORT LIGHTS":[30.6730,76.7880],"DHAKOLI":[30.7010,76.7900],"VR MALL":[30.7480,76.6420],"KALKA PUMP":[30.8400,76.9550],"PINJORE BUS STAND":[30.7980,76.9200],"PGI CHOWK":[30.7650,76.7760],"OMAXE GATE":[30.8400,76.5500],"WAVE ESTATE":[30.7500,76.6200],"CTU BUS STAND":[30.7410,76.7840],"RAM DARBAR":[30.7380,76.7560],"ECO CITY":[30.8100,76.7600],"GLOBAL ENCLAVE":[30.7510,76.6360],"SANTEMAJRA":[30.7550,76.6300]};
const LIVE_TIMEOUT=30000;
const SIMULATION_ENABLED=process.env.ALLOW_SIMULATION==="true";
const day=()=>new Date().toISOString().slice(0,10);
const gc=name=>{
  const key=name.toUpperCase();
  if(GPS[key])return GPS[key];
  const seed=name.split("").reduce((sum,char)=>sum+char.charCodeAt(0),0);
  const angle=(seed%360)*Math.PI/180,distance=0.04+(seed%100)*0.003;
  return[CU[0]+Math.cos(angle)*distance,CU[1]+Math.sin(angle)*distance];
};
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const heading=(a,b)=>(Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI+360)%360;
const distanceKm=(a,b)=>{
  const rad=value=>value*Math.PI/180;
  const dLat=rad(b[0]-a[0]),dLng=rad(b[1]-a[1]);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLng/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
};
const lastKnown=bus=>bus.hasKnownPosition?{lat:bus.lat,lng:bus.lng}:null;
const reportedPosition=bus=>bus.hasKnownPosition||SIMULATION_ENABLED?{lat:bus.lat,lng:bus.lng}:{lat:null,lng:null};
const roomName=(routeNo,stop)=>`eta:${routeNo}:${stop}`;

module.exports=io=>{
  const buses=new Map();
  const liveNow=bus=>bus.live&&Date.now()-bus.liveUpdatedAt<LIVE_TIMEOUT;
  const getEta=(routeNo,stop)=>{
    const bus=buses.get(routeNo);
    if(!bus||!liveNow(bus))return{live:false,etaMinutes:null,distanceKm:null,...(bus?reportedPosition(bus):{lat:null,lng:null}),lastKnown:bus?lastKnown(bus):null,lastUpdated:bus?.lastUpdated||null};
    const km=distanceKm([bus.lat,bus.lng],gc(stop));
    return{live:true,etaMinutes:Math.max(0,Math.ceil((km/Math.max(5,bus.speedKmh))*60)),distanceKm:Number(km.toFixed(2)),lat:bus.lat,lng:bus.lng,lastKnown:lastKnown(bus),lastUpdated:bus.lastUpdated};
  };
  const publicPosition=bus=>({
    routeNo:bus.routeNo,routeName:bus.routeName,...reportedPosition(bus),status:bus.status,
    heading:bus.heading,color:bus.color,currentStop:bus.currentStop,nextStop:bus.nextStop,
    live:liveNow(bus),lastKnown:lastKnown(bus),lastUpdated:bus.lastUpdated||null,
    etaMinutes:bus.nextStop?getEta(bus.routeNo,bus.nextStop).etaMinutes:null
  });
  const emitStatus=bus=>{
    const payload={routeNo:bus.routeNo,live:liveNow(bus),...reportedPosition(bus),lastKnown:lastKnown(bus),lastUpdated:bus.lastUpdated||null};
    io.emit("bus-status",payload);
    bus.stops.forEach(stop=>io.to(roomName(bus.routeNo,stop)).emit("bus-status",{...payload,stop,...getEta(bus.routeNo,stop)}));
  };
  const persist=bus=>BusStatus.findOneAndUpdate({routeNo:bus.routeNo,date:day()},{$set:{
    live:liveNow(bus),lastKnown:{lat:bus.lat,lng:bus.lng},lastUpdated:bus.lastUpdated||new Date()
  }},{upsert:true,setDefaultsOnInsert:true}).catch(error=>console.error("Could not persist bus location:",error.message));
  const setOffline=bus=>{
    const wasLive=bus.live;
    bus.live=false;bus.liveUpdatedAt=0;
    if(wasLive)persist(bus);
    emitStatus(bus);
  };
  const getBusStatus=(bus,stop)=>{
    const status={routeNo:bus.routeNo,live:liveNow(bus),...reportedPosition(bus),lastKnown:lastKnown(bus),lastUpdated:bus.lastUpdated||null};
    return stop?{...status,stop,...getEta(bus.routeNo,stop)}:status;
  };
  const load=async()=>{
    const routes=await Route.find({isActive:true}).lean();
    const [statuses,trips]=await Promise.all([
      BusStatus.find({routeNo:{$in:routes.map(route=>route.routeNo)}}).sort({date:-1,updatedAt:-1}).lean(),
      Trip.find({active:true}).select("driver routeNo").lean()
    ]);
    const statusByRoute=new Map(statuses.map(status=>[status.routeNo,status]));
    for(const route of routes){
      const saved=statusByRoute.get(route.routeNo),first=gc(route.stops[0]||"CU");
      const bus={
        routeNo:route.routeNo,routeName:route.routeName,stops:route.stops,
        lat:saved?.lastKnown?.lat??first[0],lng:saved?.lastKnown?.lng??first[1],
        stopIdx:0,progress:0,status:"parked",heading:0,color:route.color||"#f97316",
        live:false,liveUpdatedAt:0,lastUpdated:saved?.lastUpdated||null,
        speedKmh:25,previousFix:null,activeDriverId:null,notifiedStops:new Set(),
        hasKnownPosition:Number.isFinite(saved?.lastKnown?.lat)&&Number.isFinite(saved?.lastKnown?.lng)
      };
      const activeTrip=trips.find(trip=>trip.routeNo===route.routeNo);
      if(activeTrip)bus.activeDriverId=String(activeTrip.driver);
      buses.set(route.routeNo,bus);
    }
    console.log(`Tracking ${buses.size} buses${SIMULATION_ENABLED?" with simulation":" (simulation disabled)"}`);
  };
  const applyLocation=async(routeNo,driverId,{lat,lng,heading:direction})=>{
    if(typeof lat!=="number"||typeof lng!=="number"||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return false;
    const bus=buses.get(routeNo);
    if(!bus||bus.activeDriverId!==String(driverId))return false;
    const [activeDriver,activeTrip]=await Promise.all([
      Driver.exists({_id:driverId,routeNo,isActive:true}),
      Trip.exists({driver:driverId,routeNo,active:true})
    ]);
    if(!activeDriver||!activeTrip)return false;
    const now=Date.now();
    if(bus.previousFix){
      const elapsed=(now-bus.previousFix.time)/1000;
      const km=distanceKm([bus.previousFix.lat,bus.previousFix.lng],[lat,lng]);
      if(elapsed>=1&&km>=0.01)bus.speedKmh=Math.min(80,Math.max(5,km/elapsed*3600));
    }
    bus.previousFix={lat,lng,time:now};
    bus.lat=lat;bus.lng=lng;bus.hasKnownPosition=true;
    if(typeof direction==="number"&&Number.isFinite(direction)&&direction>=0&&direction<=360)bus.heading=direction;
    bus.status="enroute";bus.live=true;bus.liveUpdatedAt=now;bus.lastUpdated=new Date(now).toISOString();
    bus.currentStop=bus.currentStop||bus.stops[0];
    persist(bus);emitStatus(bus);
    for(const stop of bus.stops){
      const eta=getEta(routeNo,stop);
      if(eta.distanceKm!==null&&eta.distanceKm<=0.5&&!bus.notifiedStops.has(stop)){
        bus.notifiedStops.add(stop);
        const payload={routeNo,stop,distanceKm:eta.distanceKm,etaMinutes:eta.etaMinutes};
        io.emit("bus-near",payload);
        notifyBusNear(routeNo,stop,eta.etaMinutes).catch(error=>console.error("Bus-near push failed:",error.message));
      }
    }
    return true;
  };
  const startTrip=(routeNo,driverId)=>{
    const bus=buses.get(routeNo);
    if(!bus)return false;
    bus.activeDriverId=String(driverId);bus.notifiedStops.clear();bus.previousFix=null;
    setOffline(bus);return true;
  };
  const stopLive=(routeNo,driverId)=>{
    const bus=buses.get(routeNo);
    if(!bus||driverId&&bus.activeDriverId!==String(driverId))return false;
    setOffline(bus);return true;
  };
  const endTrip=(routeNo,driverId)=>{
    const bus=buses.get(routeNo);
    if(!bus||bus.activeDriverId!==String(driverId))return false;
    setOffline(bus);bus.activeDriverId=null;return true;
  };
  const tick=()=>{
    for(const bus of buses.values()){
      if(liveNow(bus))continue;
      if(bus.live){setOffline(bus);continue;}
      if(!SIMULATION_ENABLED)continue;
      if(bus.stopIdx>=bus.stops.length-1){bus.status="arrived";continue;}
      bus.status="enroute";
      const current=gc(bus.stops[bus.stopIdx]),next=gc(bus.stops[bus.stopIdx+1]);
      bus.progress=Math.min(100,bus.progress+5+(Date.now()%5));
      const position=lerp(current,next,bus.progress/100);
      bus.lat=position[0];bus.lng=position[1];bus.hasKnownPosition=true;bus.heading=heading(current,next);
      if(bus.progress>=100){bus.stopIdx++;bus.progress=0;}
      bus.currentStop=bus.stops[bus.stopIdx];bus.nextStop=bus.stops[bus.stopIdx+1]||null;
    }
    io.emit("bus-positions",Array.from(buses.values(),publicPosition));
  };

  io.on("connection",socket=>{
    socket.emit("bus-positions",Array.from(buses.values(),publicPosition));
    socket.emit("time-sync",{serverTime:new Date().toISOString()});
    socket.on("watch-route",async({routeNo,stop}={})=>{
      try{
        if(typeof routeNo!=="string"||typeof stop!=="string")return socket.emit("tracking-error",{error:"routeNo and stop are required"});
        const route=await Route.findOne({routeNo:routeNo.toUpperCase(),isActive:true}).select("routeNo stops").lean();
        if(!route||!route.stops.includes(stop))return socket.emit("tracking-error",{error:"Stop is not on that route"});
        const bus=buses.get(route.routeNo);
        if(!bus)return socket.emit("tracking-error",{error:"Route is not available for tracking"});
        socket.join(roomName(route.routeNo,stop));
        socket.emit("bus-status",getBusStatus(bus,stop));
      }catch(error){socket.emit("tracking-error",{error:"Unable to subscribe to route updates"});console.error("Socket route subscription failed:",error.message);}
    });
  });
  const driverNs=io.of("/driver");
  driverNs.use(async(socket,next)=>{
    try{
      const token=socket.handshake.auth?.token;
      if(!token)return next(new Error("No token"));
      const claims=jwt.verify(token,process.env.JWT_SECRET);
      if(claims.role!=="driver"||(claims.purpose&&claims.purpose!=="driver_access"))return next(new Error("Invalid token"));
      const driver=await Driver.findById(claims.id);
      if(!driver||!driver.isActive)return next(new Error("Driver not found"));
      socket.driver=driver;next();
    }catch(error){next(new Error("Auth failed"));}
  });
  driverNs.on("connection",socket=>{
    socket.on("location-update",async(payload={})=>{
      try{
        const applied=await applyLocation(socket.driver.routeNo,socket.driver._id,payload);
        if(!applied)socket.emit("tracking-error",{error:"Start an active trip before sharing location"});
      }catch(error){socket.emit("tracking-error",{error:"Unable to apply location update"});console.error("Socket location update failed:",error.message);}
    });
    socket.on("disconnect",()=>stopLive(socket.driver.routeNo,socket.driver._id));
  });
  io.trackingApi={applyLocation,startTrip,stopLive,endTrip,getEta};
  return load().then(()=>{setInterval(tick,3000);setInterval(()=>io.emit("time-sync",{serverTime:new Date().toISOString()}),60000);});
};
