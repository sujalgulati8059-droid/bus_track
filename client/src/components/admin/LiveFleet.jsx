import React,{useEffect,useMemo,useState}from"react";
import api from"../../utils/api";
import{useSocket}from"../../context/SocketContext";
import{Badge,LoadingSpinner}from"../common/UI";
import BusMap from"../map/BusMap";

const formatTime=value=>value?new Date(value).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"No update yet";
export default function LiveFleet(){
  const{busPositions}=useSocket();const[routes,setRoutes]=useState([]);const[drivers,setDrivers]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    Promise.all([api.get("/routes",{params:{page:1,limit:500}}),api.get("/admin/drivers")]).then(([routeResponse,driverResponse])=>{
      if(!active)return;
      setRoutes(routeResponse.data.routes||[]);setDrivers(driverResponse.data.data||[]);
    }).catch(()=>{}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  const routeMap=useMemo(()=>new Map(routes.map(route=>[route.routeNo,route])),[routes]);
  const driversByRoute=useMemo(()=>{
    const map=new Map();
    drivers.filter(driver=>driver.isActive).forEach(driver=>map.set(driver.routeNo,[...(map.get(driver.routeNo)||[]),driver]));
    return map;
  },[drivers]);
  const busByRoute=useMemo(()=>new Map(busPositions.map(bus=>[bus.routeNo,bus])),[busPositions]);
  const visibleRoutes=useMemo(()=>routes.length?routes:busPositions.map(bus=>({routeNo:bus.routeNo,routeName:bus.routeName})),[routes,busPositions]);
  const liveBuses=useMemo(()=>busPositions.filter(bus=>bus.live),[busPositions]);
  const driverNamesByRoute=useMemo(()=>Object.fromEntries([...driversByRoute].map(([routeNo,list])=>[routeNo,list.map(driver=>driver.name).join(", ")])),[driversByRoute]);

  return(<div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-black">Live Fleet</h3><p className="mt-1 text-xs text-slate-500">Only verified live GPS positions appear on the map.</p></div><Badge color="green">{liveBuses.length} LIVE</Badge></div>
    <div className="glass overflow-hidden rounded-2xl border border-black/10">
      {loading&&visibleRoutes.length===0?<LoadingSpinner text="Loading fleet..."/>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-black/8">{["Route","Route Name","Driver","Status","Last Update"].map(label=><th key={label} className="px-4 py-3 text-left text-xs uppercase text-slate-500">{label}</th>)}</tr></thead><tbody>{visibleRoutes.map((route,index)=>{
        const bus=busByRoute.get(route.routeNo),isLive=Boolean(bus?.live);
        const routeDrivers=driversByRoute.get(route.routeNo)||[];
        return <tr key={route.routeNo} className={`border-b border-black/5 ${index%2?"bg-black/1":""}`}><td className="px-4 py-3 font-mono text-xs font-semibold text-yellow-800">{route.routeNo}</td><td className="px-4 py-3 text-xs text-slate-700">{route.routeName||routeMap.get(route.routeNo)?.routeName||"-"}</td><td className="px-4 py-3 text-xs text-slate-700">{routeDrivers.map(driver=>driver.name).join(", ")||"No driver assigned"}</td><td className="px-4 py-3">{isLive?<Badge color="green">LIVE</Badge>:<span className="text-xs text-slate-400">Not live</span>}</td><td className="px-4 py-3 text-xs text-slate-500">{isLive?formatTime(bus.lastUpdated):formatTime(bus?.lastUpdated)}</td></tr>;
      })}{visibleRoutes.length===0&&<tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">No routes with assigned drivers</td></tr>}</tbody></table></div>}
    </div>
    <div className="glass overflow-hidden rounded-2xl border border-black/10">
      <div className="border-b border-black/8 px-4 py-3"><h4 className="text-sm font-bold text-black">Live bus map</h4></div>
      <div className="h-[420px]"><BusMap liveOnly driverNamesByRoute={driverNamesByRoute} compact/></div>
      {liveBuses.length===0&&<p className="border-t border-black/5 px-4 py-3 text-xs text-slate-500">No driver is live right now. Buses are not simulated.</p>}
    </div>
  </div>);
}
