import React,{useState}from"react";
import SearchForm from"../components/search/SearchForm";
import BusCard from"../components/search/BusCard";
import MyStopCard from"../components/search/MyStopCard";
import{StatCard}from"../components/common/UI";
import useStops from"../hooks/useStops";
import useMyStop from"../hooks/useMyStop";
import api from"../utils/api";
export default function HomePage({onViewOnMap}){
  const[results,setResults]=useState(null);const[loading,setLoading]=useState(false);const[error,setError]=useState("");const[lastQ,setLastQ]=useState(null);const[filter,setFilter]=useState("all");
  const{stops}=useStops();
  const{myStop}=useMyStop();
  const search=async({source,destination})=>{setLoading(true);setError("");setResults(null);setLastQ({source,destination});try{const r=await api.post("/search",{source,destination});setResults(r.data.data);}catch(e){setError(e.response?.data?.error||"Server error - is backend running?");}finally{setLoading(false);};};
  const reset=()=>{setResults(null);setError("");setLastQ(null);};
  const filtered=results?.filter(b=>filter==="to_cu"?!b.isReverse:filter==="from_cu"?b.isReverse:true).sort((a,b)=>filter==="fastest"?a.journeyDuration-b.journeyDuration:a.arrivalAtSourceMins-b.arrivalAtSourceMins);
  return(<div className="max-w-4xl mx-auto px-4 pb-16">
    {!results&&!loading&&(<section className="pt-14 pb-10 text-center"><div className="flex items-center justify-center gap-3 mb-4"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-xl shadow-yellow-500/40"><span className="text-black font-bold text-xl">CU</span></div><h1 className="font-bold text-4xl md:text-5xl text-black">BusTrack <span className="text-yellow-700">Pro</span></h1></div><p className="text-slate-500 text-lg max-w-md mx-auto">Real-time bus tracking for Chandigarh University</p></section>)}
    
    {/* MY STOP CARD - shows when user has saved their stop */}
    {!results&&!loading&&myStop&&<MyStopCard onSearch={search}/>}
    
    <div className={results?"pt-6 pb-4":"pb-8"}><SearchForm onSearch={search} loading={loading} compact={!!results}/></div>
    {loading&&(<div className="space-y-4 mt-2">{[1,2,3].map(i=>(<div key={i} className="glass rounded-2xl p-6 animate-pulse"><div className="flex gap-4"><div className="w-16 h-16 rounded-xl bg-slate-200/70"/><div className="flex-1 space-y-3"><div className="h-4 bg-slate-200/70 rounded w-1/3"/><div className="h-3 bg-slate-200/70 rounded w-1/2"/></div></div></div>))}</div>)}
    {error&&!loading&&(<div className="mt-4 glass rounded-2xl p-6 text-center border border-red-300"><p className="text-red-600 text-sm">! {error}</p><button onClick={reset} className="mt-3 text-xs text-slate-500 hover:text-black underline">Reset</button></div>)}
    {results!==null&&!loading&&(<section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div><p className="text-slate-500 text-sm"><span className="text-yellow-700 font-semibold">{lastQ?.source}</span> to <span className="text-yellow-700 font-semibold">{lastQ?.destination}</span></p><h2 className="font-bold text-xl text-black mt-0.5">{results.length>0?`${results.length} bus${results.length!==1?"es":""} found`:"No buses found"}</h2></div>
        <button onClick={reset} className="text-sm glass px-4 py-2 rounded-xl text-slate-700 hover:text-black border border-black/10 hover:border-yellow-500/50 transition-all">New Search</button>
      </div>
      {results.length>0&&(<div className="flex gap-2 mb-4 flex-wrap">{[["all","All"],["to_cu","To CU"],["from_cu","From CU"],["fastest","Fastest"]].map(([k,l])=>(<button key={k} onClick={()=>setFilter(k)} className={`text-xs px-3 py-1.5 rounded-lg transition-all ${filter===k?"bg-yellow-400/20 text-yellow-700 border border-yellow-500/50":"glass text-slate-500 hover:text-black border border-black/10"}`}>{l}</button>))}<span className="text-xs text-slate-400 self-center">{filtered?.length} showing</span></div>)}
      {results.length===0&&(<div className="glass rounded-2xl p-10 text-center"><h3 className="text-black font-bold text-xl mb-2">No direct bus found</h3><p className="text-slate-500">Between <strong>{lastQ?.source}</strong> and <strong>{lastQ?.destination}</strong></p><p className="text-slate-500 text-sm mt-2">Try swapping or check stop spelling</p></div>)}
      <div className="space-y-4">{(filtered||[]).map((bus,i)=>(<BusCard key={bus.routeNo} bus={bus} index={i} onViewOnMap={onViewOnMap}/>))}</div>
    </section>)}
    {!results&&!loading&&!error&&!myStop&&(<div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3"><StatCard icon="R" value="116+" label="Active Routes" color="text-yellow-700"/><StatCard icon="S" value={stops.length||"350+"} label="Unique Stops" color="text-cyan-700"/><StatCard icon="T" value="4:45 PM" label="Evening Depart" color="text-yellow-700"/><StatCard icon="L" value="Live" label="Bus Tracking" color="text-green-700"/></div>)}
  </div>);}