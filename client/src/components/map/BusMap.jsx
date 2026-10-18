import React,{useEffect,useRef,useState,useCallback}from"react";
import{useSocket}from"../../context/SocketContext";import api from"../../utils/api";
let L;if(typeof window!=="undefined"){L=require("leaflet");delete L.Icon.Default.prototype._getIconUrl;L.Icon.Default.mergeOptions({iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"});}
const CU=[30.7735,76.5763];
const GPS={"CU":[30.7735,76.5763],"KHARAR BUS STAND":[30.7462,76.6450],"SUNNY ENCLAVE":[30.7310,76.6220],"NAV CITY":[30.7280,76.6180],"KFC":[30.7350,76.6280],"DERABASSI BUS STAND":[30.6020,76.8030],"PHASE 7 MARKET":[30.7050,76.7140],"PHASE 5 GURUDWARA":[30.7100,76.7100],"CITY HEART":[30.7060,76.7160],"SEC 17 BUS STAND":[30.7404,76.7878],"SOHANA":[30.7160,76.6890],"SOHANA BUS STAND":[30.7160,76.6890],"LANDRAN":[30.8001,76.5901],"KURALI BUS STAND":[30.8180,76.5720],"MANSA DEVI":[30.7560,76.8100],"IT PARK":[30.7300,76.8050],"MANIMAJRA":[30.7260,76.8420],"AIRPORT LIGHTS":[30.6730,76.7880],"DHAKOLI":[30.7010,76.7900],"VR MALL":[30.7480,76.6420],"KALKA PUMP":[30.8400,76.9550],"PINJORE BUS STAND":[30.7980,76.9200],"PGI CHOWK":[30.7650,76.7760],"OMAXE GATE":[30.8400,76.5500],"WAVE ESTATE":[30.7500,76.6200],"CTU BUS STAND":[30.7410,76.7840],"RAM DARBAR":[30.7380,76.7560],"ECO CITY":[30.8100,76.7600],"GLOBAL ENCLAVE":[30.7510,76.6360],"SANTEMAJRA":[30.7550,76.6300],"BADDI BUS STAND":[30.9600,76.7900],"MACHHIWARA":[30.9180,76.9570]};
const gc=n=>{const k=n.toUpperCase();if(GPS[k])return GPS[k];const s=n.split("").reduce((a,c)=>a+c.charCodeAt(0),0),ang=(s%360)*Math.PI/180,d=0.04+(s%100)*0.003;return[CU[0]+Math.cos(ang)*d,CU[1]+Math.sin(ang)*d];};

// Live bus marker: a soft pulsing halo (only for buses actively streaming GPS from
// the driver app) behind a heading-rotated teardrop, with the "B" glyph
// counter-rotated so it always reads upright regardless of bearing.
const busIcon=(color,h=0,live=false)=>{const c=color||"#a16207";return L.divIcon({className:"",html:`<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center">${live?`<div class="bus-pulse" style="position:absolute;width:20px;height:20px;border-radius:50%;background:#22c55e;opacity:.45"></div>`:""}<div style="position:relative;width:22px;height:22px;border-radius:50% 50% 50% 0;background:${c};border:2px solid ${live?"#22c55e":"#fff"};transform:rotate(${h-45}deg);box-shadow:0 2px 8px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(${-(h-45)}deg);color:#fff;font-size:9px;font-weight:800">B</span></div></div>`,iconSize:[28,28],iconAnchor:[14,14]});};
const stopIcon=c=>L.divIcon({className:"",html:`<div style="width:9px;height:9px;border-radius:50%;background:${c||"#a16207"};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"/>`,iconSize:[9,9],iconAnchor:[4,4]});
const cuIcon=L.divIcon({className:"",html:`<div style="display:flex;align-items:center;gap:4px;background:#0f172a;color:#fff;padding:5px 10px 5px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,.3);border:2px solid #facc15">🎓 CU Campus</div>`,iconAnchor:[46,16]});

const busPopup=bus=>`<div style="font-family:'DM Sans',sans-serif;min-width:180px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:2px"><span style="width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2)"></span><b style="color:#a16207;font-size:13px">${bus.routeNo}</b>${bus.live?`<span style="color:#16a34a;font-size:9px;font-weight:700;background:#dcfce7;padding:1px 6px;border-radius:8px;margin-left:2px">● LIVE</span>`:""}</div><div style="font-size:11px;color:#64748b;margin-bottom:8px">${bus.routeName||""}</div>${bus.driverName?`<div style="font-size:11px;color:#334155;margin-bottom:6px">Driver: ${bus.driverName}</div>`:""}${bus.lastUpdated?`<div style="font-size:10px;color:#64748b;margin-bottom:6px">Updated: ${new Date(bus.lastUpdated).toLocaleTimeString()}</div>`:""}<div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;border-top:1px solid rgba(0,0,0,.08);padding-top:7px"><div><div style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.03em">At</div><div style="font-weight:600;color:#0f172a">${bus.currentStop||"-"}</div></div><div style="text-align:right"><div style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.03em">Next</div><div style="font-weight:600;color:#0f172a">${bus.nextStop||"Terminus"}</div></div></div></div>`;
const stopPopup=(s,routeNo)=>`<div style="font-family:'DM Sans',sans-serif"><b style="color:#0f172a;font-size:12px">${s}</b><br/><small style="color:#94a3b8">${routeNo||""}</small></div>`;

export default function BusMap({focusRoute,liveOnly=false,driverNamesByRoute={},compact=false}){
  const mapRef=useRef(null),mapI=useRef(null),bmRef=useRef({}),rlRef=useRef([]),animRef=useRef({});
  const streetRef=useRef(null),satRef=useRef(null),labelsRef=useRef(null);
  const{busPositions,connected}=useSocket();
  const[routes,setRoutes]=useState([]);const[active,setActive]=useState(null);const[filter,setFilter]=useState("");const[showAll,setShowAll]=useState(true);const[style,setStyle]=useState("map");

  useEffect(()=>{
    if(!L||mapI.current)return;
    mapI.current=L.map(mapRef.current,{center:CU,zoom:12,zoomControl:true});
    streetRef.current=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19});
    satRef.current=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{attribution:"&copy; Esri",maxZoom:19});
    labelsRef.current=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,pane:"shadowPane"});
    streetRef.current.addTo(mapI.current);
    L.marker(CU,{icon:cuIcon}).addTo(mapI.current);
    return()=>{mapI.current?.remove();mapI.current=null;};
  },[]);

  // swap the base layer when the user toggles Map / Satellite
  useEffect(()=>{
    if(!mapI.current||!streetRef.current)return;
    [streetRef.current,satRef.current,labelsRef.current].forEach(l=>{if(mapI.current.hasLayer(l))mapI.current.removeLayer(l);});
    if(style==="satellite"){satRef.current.addTo(mapI.current);labelsRef.current.addTo(mapI.current);}
    else streetRef.current.addTo(mapI.current);
  },[style]);

  useEffect(()=>{api.get("/routes?limit=500").then(r=>setRoutes(r.data.routes||[])).catch(()=>{});},[]);
  useEffect(()=>{if(focusRoute){setActive(focusRoute.routeNo);drawRoute(focusRoute);}},[focusRoute]);

  const drawRoute=useCallback(route=>{
    if(!mapI.current)return;
    rlRef.current.forEach(l=>{try{mapI.current.removeLayer(l);}catch{}});rlRef.current=[];
    const stops=route.stops||route.fullRoute||[];const pts=stops.map(s=>gc(s));
    const line=L.polyline(pts,{color:route.color||"#a16207",weight:3.5,opacity:0.85,lineCap:"round"}).addTo(mapI.current);
    rlRef.current.push(line);
    stops.forEach((s,i)=>{const m=L.marker(pts[i],{icon:stopIcon(route.color||"#a16207")}).bindPopup(stopPopup(s,route.routeNo)).addTo(mapI.current);rlRef.current.push(m);});
    try{mapI.current.fitBounds(line.getBounds(),{padding:[40,40]});}catch{}
  },[]);

  // smoothly tween a marker between socket updates instead of snapping to the new point
  const animateMarker=(marker,from,to,key,duration=900)=>{
    if(animRef.current[key])cancelAnimationFrame(animRef.current[key]);
    const start=performance.now();
    const step=now=>{
      const t=Math.min((now-start)/duration,1);
      const e=1-Math.pow(1-t,3);
      marker.setLatLng([from[0]+(to[0]-from[0])*e,from[1]+(to[1]-from[1])*e]);
      if(t<1)animRef.current[key]=requestAnimationFrame(step);
    };
    animRef.current[key]=requestAnimationFrame(step);
  };

  useEffect(()=>{
    if(!mapI.current)return;
    const visibleBuses=busPositions.filter(bus=>!liveOnly||bus.live);
    if(liveOnly){
      const visibleRoutes=new Set(visibleBuses.map(bus=>bus.routeNo));
      Object.entries(bmRef.current).forEach(([routeNo,marker])=>{
        if(!visibleRoutes.has(routeNo)){mapI.current.removeLayer(marker);delete bmRef.current[routeNo];}
      });
    }
    visibleBuses.forEach(bus=>{
      if(!showAll&&bus.routeNo!==active)return;
      if(!Number.isFinite(bus.lat)||!Number.isFinite(bus.lng))return;
      const ll=[bus.lat,bus.lng];
      const displayBus={...bus,driverName:driverNamesByRoute[bus.routeNo]};
      const existing=bmRef.current[bus.routeNo];
      if(existing){
        const cur=existing.getLatLng();
        animateMarker(existing,[cur.lat,cur.lng],ll,bus.routeNo);
        existing.setIcon(busIcon(bus.color,bus.heading||0,bus.live));
        existing.setPopupContent(busPopup(displayBus));
      }else{
        const m=L.marker(ll,{icon:busIcon(bus.color,bus.heading||0,bus.live)}).bindPopup(busPopup(displayBus)).addTo(mapI.current);
        m.on("click",()=>setActive(bus.routeNo));
        bmRef.current[bus.routeNo]=m;
      }
    });
    return()=>{Object.values(animRef.current).forEach(id=>cancelAnimationFrame(id));};
  },[busPositions,showAll,active,liveOnly,driverNamesByRoute]);

  const filtered=routes.filter(r=>(!liveOnly||busPositions.some(bus=>bus.routeNo===r.routeNo&&bus.live))&&(!filter||r.routeNo.toUpperCase().includes(filter.toUpperCase())||r.routeName.toUpperCase().includes(filter.toUpperCase())));
  const recenter=()=>mapI.current?.flyTo(CU,13,{duration:0.9});

  return(<div className={`flex flex-col md:flex-row ${compact?"h-full":"h-[calc(100vh-4rem)]"}`}>
    <div className="w-full md:w-64 glass border-r border-black/8 flex flex-col order-2 md:order-1 h-44 md:h-auto flex-shrink-0">
      <div className="p-2.5 border-b border-black/8"><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter routes..." className="field text-xs py-1.5"/></div>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/8 text-xs text-slate-500"><span>{filtered.length} {liveOnly?"live buses":"routes"}</span><label className="flex items-center gap-1.5 cursor-pointer"><span>All</span><div className="relative w-7 h-4"><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)} className="sr-only peer"/><div className="w-7 h-4 bg-slate-200 rounded-full peer-checked:bg-yellow-400 transition-colors"/><div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-3 transition-transform"/></div></label></div>
      <div className="flex-1 overflow-y-auto">{filtered.slice(0,60).map(r=>(<button key={r._id} onClick={()=>{setActive(r.routeNo);drawRoute(r);}} className={`w-full text-left px-3 py-2 border-b border-black/5 flex items-center gap-2 hover:bg-black/5 transition-colors ${active===r.routeNo?"bg-yellow-400/10 border-l-2 border-l-yellow-500":""}`}><span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:r.color||"#a16207"}}/><div className="min-w-0"><p className="font-mono text-xs text-slate-700 truncate">{r.routeNo}</p><p className="text-[10px] text-slate-500 truncate">{r.routeName}</p></div></button>))}</div>
      <div className="p-2.5 border-t border-black/8 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected?"bg-green-400 animate-pulse":"bg-red-400"}`}/><span className="text-xs text-slate-500">{connected?`${busPositions.length} live`:"Offline"}</span></div>
    </div>
    <div className="flex-1 relative order-1 md:order-2 min-h-[300px]">
      <div ref={mapRef} className="w-full h-full"/>

      {/* custom Map / Satellite toggle, replacing Leaflet's default control */}
      <div className="absolute top-3 right-3 z-[1000] glass rounded-xl p-1 flex gap-0.5 shadow-lg">
        {[["map","Map"],["satellite","Satellite"]].map(([k,l])=>(<button key={k} onClick={()=>setStyle(k)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${style===k?"bg-yellow-400 text-black":"text-slate-600 hover:bg-black/5"}`}>{l}</button>))}
      </div>

      {/* recenter on campus */}
      <button onClick={recenter} title="Recenter on CU Campus" className="absolute bottom-5 right-3 z-[1000] w-10 h-10 rounded-full glass shadow-lg flex items-center justify-center text-lg hover:bg-yellow-400/20 hover:border-yellow-500/50 transition-all">🎯</button>
    </div>
  </div>);}
