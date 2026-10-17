import React,{useState}from"react";
import{Badge}from"../common/UI";
import useLiveClock from"../../hooks/useLiveClock";
import{subscribeToRoute,unsubscribeFromRoute,isPushSupported}from"../../utils/pushNotify";
const fmtT=m=>{const h=Math.floor(m/60)%24,mn=m%60,p=h>=12?"PM":"AM",d=h>12?h-12:h||12;return `${d}:${String(mn).padStart(2,"0")} ${p}`;};
const toM=t=>{const[h,m]=(t||"08:00").split(":").map(Number);return h*60+m;};
export default function BusCard({bus,index,onViewOnMap}){
  const[exp,setExp]=useState(false);
  const[notifying,setNotifying]=useState(false);
  const[notifyBusy,setNotifyBusy]=useState(false);
  const now=useLiveClock(30000);
  const diff=bus.arrivalAtSourceMins-now;
  const sc=diff<0?"red":diff<=15?"orange":"cyan";
  const sl=diff<0?"Departed":diff===0?"Now!":`In ${diff}m`;
  const toggleNotify=async()=>{
    setNotifyBusy(true);
    if(notifying){await unsubscribeFromRoute(bus.routeNo);setNotifying(false);}
    else{const{error}=await subscribeToRoute(bus.routeNo);if(!error)setNotifying(true);else window.alert(error);}
    setNotifyBusy(false);
  };
  return(<div className={`glass rounded-2xl overflow-hidden border border-black/10 animate-fade-up opacity-0 [animation-fill-mode:forwards] hover:border-yellow-500/40 transition-colors ${bus.isWorking===false?"grayscale-[60%]":""}`} style={{animationDelay:`${index*70}ms`}}>
    <div className="p-5">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center" style={{background:bus.color+"22",border:`1px solid ${bus.color}44`}}><span className="font-mono text-[9px] text-slate-500">ROUTE</span><span className="font-bold text-lg" style={{color:bus.color}}>{bus.routeNo.replace("R-","").replace("-R","")}</span></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div><div className="flex items-center gap-2 flex-wrap mb-0.5"><span className="font-mono text-xs text-slate-500">{bus.routeNo}</span><Badge color={bus.isReverse?"purple":"green"}>{bus.isReverse?"CU to Home":"Home to CU"}</Badge></div><h3 className="font-bold text-black text-sm truncate max-w-xs">{bus.routeName}</h3></div>
            {bus.isWorking===false?<Badge color="red">Not running today</Badge>:<Badge color={sc}>{sl}</Badge>}
          </div>
          <div className="mt-3 flex items-center gap-4 flex-wrap">{[{l:"Departs",v:bus.arrivalAtSource},{l:"Arrives",v:bus.arrivalAtDestination},{l:"Journey",v:`~${bus.journeyDuration}m`},{l:"Stops",v:bus.totalStops-1}].map(t=>(<div key={t.l} className="flex flex-col"><span className="text-[10px] text-slate-500">{t.l}</span><span className="font-mono text-xs text-black font-semibold">{t.v}</span></div>))}</div>
          {bus.isWorking===false&&bus.offReason&&<p className="text-xs text-red-600/80 mt-1">{bus.offReason}</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">{bus.stopsBetween.map((s,i)=>(<span key={s+i} className={`text-xs px-2.5 py-1 rounded-lg ${i===0?"bg-yellow-400/20 text-yellow-700 border border-yellow-500/50":i===bus.stopsBetween.length-1?"bg-cyan-100 text-cyan-700 border border-cyan-300":"bg-black/5 text-slate-500 border border-black/10"}`}>{s}</span>))}</div>
      {onViewOnMap&&<button onClick={()=>onViewOnMap(bus)} className="mt-3 text-xs text-cyan-700 hover:text-cyan-900 underline transition-colors">View on Map</button>}
      {isPushSupported()&&<button onClick={toggleNotify} disabled={notifyBusy} className={`mt-3 ml-4 text-xs underline transition-colors disabled:opacity-50 ${notifying?"text-green-700 hover:text-green-800":"text-slate-500 hover:text-black"}`}>{notifying?"🔔 Notifying me if this goes off":"🔔 Notify me if this route goes off"}</button>}
    </div>
    <button onClick={()=>setExp(!exp)} className="w-full px-5 py-2.5 flex items-center justify-between text-xs border-t border-black/8 text-slate-500 hover:text-black hover:bg-black/3 transition-colors"><span>{exp?"Hide route":`Show all ${bus.fullRoute.length} stops`}</span><span className={`transition-transform ${exp?"rotate-180":""}`}>v</span></button>
    {exp&&(<div className="px-5 pb-5 pt-2 border-t border-black/8 space-y-1">{bus.fullRoute.map((stop,i)=>{const isSrc=i===bus.sourceIndex,isDst=i===bus.destIndex,inp=i>=bus.sourceIndex&&i<=bus.destIndex,sm=toM(bus.departureTime)+i*12;return(<div key={stop+i} className={`relative flex items-center gap-3 py-1 ${!inp?"opacity-30":""}`}>{i<bus.fullRoute.length-1&&<div className={`absolute left-[6px] top-[18px] bottom-[-4px] w-0.5 ${inp&&i<bus.destIndex?"bg-yellow-400/50":"bg-slate-200"}`}/>}<div className={`relative z-10 w-3 h-3 rounded-full flex-shrink-0 ${isSrc?"bg-yellow-400 ring-2 ring-yellow-500/50 ring-offset-1 ring-offset-white":isDst?"bg-cyan-400 ring-2 ring-cyan-400/30 ring-offset-1 ring-offset-white":inp?"bg-yellow-600":"bg-slate-200"}`}/><div className="flex-1 flex items-center justify-between"><span className={`text-xs ${isSrc?"text-yellow-700 font-semibold":isDst?"text-cyan-700 font-semibold":inp?"text-slate-700":"text-slate-400"}`}>{stop}{isSrc&&<span className="ml-1.5 text-[10px] bg-yellow-400/20 text-yellow-700 px-1.5 py-0.5 rounded-full">YOUR STOP</span>}{isDst&&<span className="ml-1.5 text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">DESTINATION</span>}</span><span className="font-mono text-[10px] text-slate-500 ml-2">{fmtT(sm)}</span></div></div>);})}</div>)}
  </div>);}