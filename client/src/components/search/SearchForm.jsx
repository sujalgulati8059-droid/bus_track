import React,{useState,useEffect,useRef,useCallback}from"react";
import useStops from"../../hooks/useStops";
import useMyStop from"../../hooks/useMyStop";

export default function SearchForm({onSearch,loading,compact,prefillSource,prefillDest}){
  const{stops:all}=useStops();
  const{save}=useMyStop();
  const[src,setSrc]=useState(prefillSource||"");
  const[dst,setDst]=useState(prefillDest||"");
  const[so,setSo]=useState(false);const[do_,setDo]=useState(false);
  const[err,setErr]=useState("");
  const sr=useRef(null);const dr=useRef(null);

  useEffect(()=>{if(prefillSource)setSrc(prefillSource);},[prefillSource]);
  useEffect(()=>{if(prefillDest)setDst(prefillDest);},[prefillDest]);

  useEffect(()=>{const h=e=>{if(sr.current&&!sr.current.contains(e.target))setSo(false);if(dr.current&&!dr.current.contains(e.target))setDo(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const filter=useCallback(q=>q.length<1?[]:all.filter(s=>s.includes(q.toUpperCase())).slice(0,8),[all]);
  
  const submit=e=>{
    e.preventDefault();
    const s=src.trim().toUpperCase(),d=dst.trim().toUpperCase();
    if(!s)return setErr("Enter boarding stop");
    if(!d)return setErr("Enter destination");
    if(s===d)return setErr("Cannot be the same");
    setErr("");
    onSearch({source:s,destination:d});
  };

  const Drop=({open,query,onSelect,label})=>open&&filter(query).length>0?(<ul className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden bg-slate-100 border border-black/10 shadow-2xl max-h-52 overflow-y-auto">{filter(query).map(s=>(<li key={s} onMouseDown={()=>onSelect(s)} className="px-4 py-2.5 text-sm text-slate-800 cursor-pointer hover:bg-yellow-400/10">{s}</li>))}</ul>):null;

  return(<div className={`glass rounded-3xl p-6 ${!compact&&"shadow-2xl"}`}>
    {!compact&&<h2 className="font-bold text-xl text-black mb-5">Where are you travelling?</h2>}
    <form onSubmit={submit}>
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div className="flex-1 relative" ref={sr}>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">From</label>
          <input value={src} onChange={e=>{setSrc(e.target.value);setSo(true);setErr("");}} onFocus={()=>setSo(true)} placeholder="Boarding stop..." className="field"/>
          <Drop open={so} query={src} onSelect={v=>{setSrc(v);setSo(false);}}/>
        </div>
        <button type="button" onClick={()=>{setSrc(dst);setDst(src);}} className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100/80 border border-black/10 text-slate-500 hover:text-yellow-700 transition-all mb-0.5 flex-shrink-0 text-lg">⇌</button>
        <div className="flex-1 relative" ref={dr}>
          <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">To</label>
          <input value={dst} onChange={e=>{setDst(e.target.value);setDo(true);setErr("");}} onFocus={()=>setDo(true)} placeholder="Destination..." className="field"/>
          <Drop open={do_} query={dst} onSelect={v=>{setDst(v);setDo(false);}}/>
        </div>
        <button type="submit" disabled={loading} className="flex-shrink-0 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold px-8 py-3 rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-yellow-500/40 text-sm">{loading?<span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-white rounded-full animate-spin"/>Searching...</span>:"Find Buses"}</button>
      </div>
      {err&&<p className="mt-2 text-red-600 text-sm">! {err}</p>}

      {/* Save My Stop button - shows after typing source */}
      {src && !compact && (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={()=>save(src.trim().toUpperCase())} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-500/50 text-yellow-700 hover:bg-yellow-400/20 transition-all">
            Save "{src}" as My Stop
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center">Quick:</span>
        {[{s:"KHARAR BUS STAND",d:"CU"},{s:"CU",d:"SUNNY ENCLAVE"},{s:"DERABASSI BUS STAND",d:"CU"},{s:"CU",d:"PHASE 7 MARKET"}].map(q=>(<button key={q.s+q.d} type="button" onClick={()=>{setSrc(q.s);setDst(q.d);}} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100/80 border border-black/10 text-slate-500 hover:text-yellow-700 hover:border-yellow-500/50 transition-all">{q.s} -> {q.d}</button>))}
      </div>
    </form>
  </div>);}