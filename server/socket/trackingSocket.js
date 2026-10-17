const jwt=require("jsonwebtoken");
const Route=require("../models/Route"),Driver=require("../models/Driver");
const CU=[30.7735,76.5763];
const GPS={"CU":[30.7735,76.5763],"KHARAR BUS STAND":[30.7462,76.6450],"SUNNY ENCLAVE":[30.7310,76.6220],"NAV CITY":[30.7280,76.6180],"KFC":[30.7350,76.6280],"DERABASSI BUS STAND":[30.6020,76.8030],"PHASE 7 MARKET":[30.7050,76.7140],"PHASE 5 GURUDWARA":[30.7100,76.7100],"CITY HEART":[30.7060,76.7160],"SEC 17 BUS STAND":[30.7404,76.7878],"SOHANA":[30.7160,76.6890],"SOHANA BUS STAND":[30.7160,76.6890],"LANDRAN":[30.8001,76.5901],"KURALI BUS STAND":[30.8180,76.5720],"MANSA DEVI":[30.7560,76.8100],"IT PARK":[30.7300,76.8050],"MANIMAJRA":[30.7260,76.8420],"AIRPORT LIGHTS":[30.6730,76.7880],"DHAKOLI":[30.7010,76.7900],"VR MALL":[30.7480,76.6420],"KALKA PUMP":[30.8400,76.9550],"PINJORE BUS STAND":[30.7980,76.9200],"PGI CHOWK":[30.7650,76.7760],"OMAXE GATE":[30.8400,76.5500],"WAVE ESTATE":[30.7500,76.6200],"CTU BUS STAND":[30.7410,76.7840],"RAM DARBAR":[30.7380,76.7560],"ECO CITY":[30.8100,76.7600],"GLOBAL ENCLAVE":[30.7510,76.6360],"SANTEMAJRA":[30.7550,76.6300]};
const gc=n=>{const k=n.toUpperCase();if(GPS[k])return GPS[k];const s=n.split("").reduce((a,c)=>a+c.charCodeAt(0),0),ang=(s%360)*Math.PI/180,d=0.04+(s%100)*0.003;return[CU[0]+Math.cos(ang)*d,CU[1]+Math.sin(ang)*d];};
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const hdg=(a,b)=>(Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI+360)%360;
const LIVE_TIMEOUT=30000; // ms - how long a driver's GPS ping is trusted before falling back to simulation

module.exports=(io)=>{
  const buses=new Map();
  const load=async()=>{try{const routes=await Route.find({isActive:true,routeNo:{$not:/-R$/}}).lean();routes.forEach(r=>{if(!buses.has(r.routeNo)){const s=gc(r.stops[0]);buses.set(r.routeNo,{routeNo:r.routeNo,routeName:r.routeName,stops:r.stops,lat:s[0],lng:s[1],stopIdx:0,progress:0,status:"parked",heading:0,color:r.color||"#f97316",live:false,liveUpdatedAt:0});}});console.log("Tracking "+buses.size+" buses");}catch(e){console.error(e.message);}};

  const isLive=b=>b.live&&Date.now()-b.liveUpdatedAt<LIVE_TIMEOUT;

  const tick=()=>{buses.forEach(b=>{if(isLive(b))return;if(b.live){b.live=false;} // GPS went stale, resume simulation from last known point
    if(b.stopIdx>=b.stops.length-1){b.status="arrived";return;}b.status="enroute";const cur=gc(b.stops[b.stopIdx]),nxt=gc(b.stops[b.stopIdx+1]);b.progress=Math.min(100,b.progress+5+(Date.now()%5));const p=lerp(cur,nxt,b.progress/100);b.lat=p[0];b.lng=p[1];b.heading=hdg(cur,nxt);if(b.progress>=100){b.stopIdx++;b.progress=0;}b.currentStop=b.stops[b.stopIdx];b.nextStop=b.stops[b.stopIdx+1]||null;});};

  const emit=()=>io.emit("bus-positions",Array.from(buses.values()).map(b=>({routeNo:b.routeNo,routeName:b.routeName,lat:b.lat,lng:b.lng,status:b.status,heading:b.heading,color:b.color,currentStop:b.currentStop,nextStop:b.nextStop,live:isLive(b)})));

  io.on("connection",socket=>{socket.emit("bus-positions",Array.from(buses.values()));socket.emit("time-sync",{serverTime:new Date().toISOString()});});

  // Driver namespace: authenticated phones push real GPS pings here
  const driverNs=io.of("/driver");
  driverNs.use(async(socket,next)=>{try{const token=socket.handshake.auth?.token;if(!token)return next(new Error("No token"));const d=jwt.verify(token,process.env.JWT_SECRET);if(d.role!=="driver")return next(new Error("Invalid token"));const driver=await Driver.findById(d.id);if(!driver||!driver.isActive)return next(new Error("Driver not found"));socket.driver=driver;next();}catch(e){next(new Error("Auth failed"));}});
  // One place that applies a driver GPS ping (used by both the socket and the REST endpoint)
  const applyLocation=(routeNo,{lat,lng,heading})=>{
    if(typeof lat!=="number"||typeof lng!=="number")return false;
    const b=buses.get(routeNo);if(!b)return false;
    b.lat=lat;b.lng=lng;if(typeof heading==="number"&&heading>=0)b.heading=heading;b.status="enroute";b.live=true;b.liveUpdatedAt=Date.now();
    b.currentStop=b.currentStop||b.stops[0];
    return true;
  };
  const stopLive=routeNo=>{const b=buses.get(routeNo);if(b)b.live=false;};
  io.trackingApi={applyLocation,stopLive};

  driverNs.on("connection",socket=>{
    socket.on("location-update",({lat,lng,heading})=>applyLocation(socket.driver.routeNo,{lat,lng,heading}));
    socket.on("disconnect",()=>stopLive(socket.driver.routeNo));
  });

  load().then(()=>{setInterval(()=>{tick();emit();},3000);setInterval(()=>io.emit("time-sync",{serverTime:new Date().toISOString()}),60000);});
};
