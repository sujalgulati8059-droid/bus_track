import React,{useEffect,useState}from"react";
import useMyStop from"../../hooks/useMyStop";
import api from"../../utils/api";

export default function MyStopCard({onSearch}){
  const{myStop,clear}=useMyStop();
  const[toCU,setToCU]=useState(null);
  const[fromCU,setFromCU]=useState(null);
  const[loading,setLoading]=useState(false);

  useEffect(()=>{
    if(!myStop)return;
    setLoading(true);
    // Search both directions simultaneously
    Promise.all([
      api.post("/search",{source:myStop,destination:"CU"}),
      api.post("/search",{source:"CU",destination:myStop}),
    ]).then(([r1,r2])=>{
      setToCU(r1.data.data?.[0]||null);
      setFromCU(r2.data.data?.[0]||null);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[myStop]);

  if(!myStop)return null;

  const now=new Date().getHours()*60+new Date().getMinutes();

  return(
    <div className="glass rounded-2xl p-5 border border-yellow-500/50 mb-4 animate-fade-up opacity-0 [animation-fill-mode:forwards]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Your Stop</p>
          <h3 className="font-bold text-black text-lg mt-0.5">{myStop}</h3>
        </div>
        <button onClick={clear} className="text-xs text-slate-500 hover:text-red-600 transition-colors border border-black/10 hover:border-red-300 px-3 py-1.5 rounded-lg">Change stop</button>
      </div>

      {loading&&<div className="flex items-center gap-2 text-slate-500 text-sm"><div className="w-4 h-4 border-2 border-black/10 border-t-yellow-500 rounded-full animate-spin"/>Loading your buses...</div>}

      {!loading&&(
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* To CU */}
          <BusQuickCard bus={toCU} label="Next bus TO CU" direction="to" now={now} onSearch={()=>onSearch({source:myStop,destination:"CU"})}/>
          {/* From CU */}
          <BusQuickCard bus={fromCU} label="Return FROM CU" direction="from" now={now} onSearch={()=>onSearch({source:"CU",destination:myStop})}/>
        </div>
      )}
    </div>
  );
}

function BusQuickCard({bus,label,direction,now,onSearch}){
  if(!bus)return(
    <div className="glass rounded-xl p-4 border border-black/8 opacity-50">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-500">No bus found</p>
    </div>
  );

  const diff=bus.arrivalAtSourceMins-now;
  const statusColor=diff<0?"text-red-600":diff<=15?"text-yellow-700":"text-green-700";
  const statusText=diff<0?"Departed":diff===0?"Arriving Now":`In ${diff} mins`;

  return(
    <button onClick={onSearch} className="glass rounded-xl p-4 border border-black/10 hover:border-yellow-500/50 transition-all text-left w-full">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-mono font-bold text-black text-sm" style={{color:bus.color}}>{bus.routeNo}</p>
      <p className="text-xs text-slate-500 truncate mt-0.5">{bus.routeName}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-sm text-black">{bus.arrivalAtSource}</span>
        <span className={`text-xs font-semibold ${statusColor}`}>{statusText}</span>
      </div>
    </button>
  );
}