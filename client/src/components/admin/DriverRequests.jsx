import React,{useCallback,useEffect,useMemo,useState}from"react";
import toast from"react-hot-toast";
import api from"../../utils/api";
import{Badge,LoadingSpinner}from"../common/UI";

const statusColors={pending:"orange",approved:"green",rejected:"red"};
const formatDate=value=>value?new Date(value).toLocaleString():"-";

export default function DriverRequests({onApproved,onPendingCount}){
  const[status,setStatus]=useState("pending");const[requests,setRequests]=useState([]);const[loading,setLoading]=useState(false);const[routeChoice,setRouteChoice]=useState({});const[busyId,setBusyId]=useState("");const[rejectTarget,setRejectTarget]=useState(null);const[reason,setReason]=useState("");const[routes,setRoutes]=useState([]);
  const routeNames=useMemo(()=>new Map(routes.map(route=>[route.routeNo,route.routeName])),[routes]);
  useEffect(()=>{api.get("/routes",{params:{page:1,limit:500}}).then(response=>setRoutes(response.data.routes||[])).catch(()=>toast.error("Could not load route choices"));},[]);
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const response=await api.get("/admin/driver-requests",{params:{status}});
      const data=response.data.data||[];
      setRequests(data);
      if(status==="pending")onPendingCount(data.length);
    }catch(error){toast.error(error.response?.data?.error||"Could not load driver requests");}
    finally{setLoading(false);}
  },[status,onPendingCount]);
  useEffect(()=>{load();const timer=setInterval(load,20000);return()=>clearInterval(timer);},[load]);

  const approve=async request=>{
    const routeNo=routeChoice[request._id]||request.requestedRoute;
    const previous=requests;
    setRequests(current=>current.filter(item=>item._id!==request._id));
    setBusyId(request._id);
    try{
      await api.post(`/admin/driver-requests/${request._id}/approve`,{routeNo});
      toast.success(`${request.name} approved`);
      if(status==="pending")onPendingCount(count=>Math.max(0,count-1));
      onApproved();
      load();
    }catch(error){
      setRequests(previous);
      toast.error(error.response?.data?.error||"Could not approve request");
    }finally{setBusyId("");}
  };
  const reject=async()=>{
    if(!rejectTarget)return;
    const target=rejectTarget,previous=requests;
    setRequests(current=>current.filter(item=>item._id!==target._id));
    setBusyId(target._id);
    try{
      await api.post(`/admin/driver-requests/${target._id}/reject`,{reason:reason.trim()});
      toast.success(`${target.name}'s request rejected`);
      if(status==="pending")onPendingCount(count=>Math.max(0,count-1));
      setRejectTarget(null);setReason("");load();
    }catch(error){
      setRequests(previous);
      toast.error(error.response?.data?.error||"Could not reject request");
    }finally{setBusyId("");}
  };

  return(<div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-black">Driver Requests</h3><div className="flex gap-2">{["pending","approved","rejected"].map(value=><button key={value} onClick={()=>setStatus(value)} className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition-all ${status===value?"bg-yellow-400/20 text-yellow-800 border border-yellow-500/50":"glass border border-black/10 text-slate-600 hover:text-black"}`}>{value}</button>)}</div></div>
    {loading&&requests.length===0?<LoadingSpinner text="Loading driver requests..."/>:<div className="glass overflow-hidden rounded-2xl border border-black/10"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-black/8">{["Driver","Phone","Requested Route","Requested At","Status","Actions"].map(label=><th key={label} className="px-4 py-3 text-left text-xs uppercase text-slate-500">{label}</th>)}</tr></thead><tbody>{requests.map((request,index)=><tr key={request._id} className={`border-b border-black/5 ${index%2?"bg-black/1":""}`}><td className="px-4 py-3 text-xs font-semibold text-slate-800">{request.name}</td><td className="px-4 py-3 font-mono text-xs text-slate-700">{request.phone}</td><td className="px-4 py-3"><span className="font-mono text-xs text-yellow-800">{request.requestedRoute}</span><span className="ml-2 text-xs text-slate-500">{routeNames.get(request.requestedRoute)||"Route name unavailable"}</span></td><td className="px-4 py-3 text-xs text-slate-500">{formatDate(request.createdAt)}</td><td className="px-4 py-3"><Badge color={statusColors[request.status]||"brand"}>{request.status}</Badge>{request.status==="rejected"&&request.rejectReason&&<p className="mt-1 max-w-48 text-xs text-slate-500">{request.rejectReason}</p>}</td><td className="min-w-64 px-4 py-3">{request.status==="pending"?<div className="flex flex-wrap gap-2"><select value={routeChoice[request._id]||request.requestedRoute} onChange={event=>setRouteChoice(current=>({...current,[request._id]:event.target.value}))} className="field min-w-32 text-xs">{!routes.some(route=>route.routeNo===request.requestedRoute)&&<option value={request.requestedRoute}>{request.requestedRoute} — requested route</option>}{routes.filter(route=>route.isActive!==false).map(route=><option key={route._id} value={route.routeNo}>{route.routeNo} — {route.routeName}</option>)}</select><button disabled={busyId===request._id} onClick={()=>approve(request)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">Approve</button><button disabled={busyId===request._id} onClick={()=>{setRejectTarget(request);setReason("");}} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button></div>:<span className="text-xs text-slate-400">Reviewed {formatDate(request.reviewedAt)}</span>}</td></tr>)}{requests.length===0&&<tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-500">No {status} driver requests</td></tr>}</tbody></table></div></div>}
    {rejectTarget&&<div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setRejectTarget(null);}}><div role="dialog" aria-modal="true" aria-labelledby="reject-driver-title" className="glass w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-2xl"><h3 id="reject-driver-title" className="font-bold text-black">Reject {rejectTarget.name}</h3><p className="mt-1 text-xs text-slate-500">Enter a reason the applicant can see.</p><textarea value={reason} onChange={event=>setReason(event.target.value)} maxLength={500} rows={4} className="field mt-4 w-full resize-none text-sm" placeholder="Reason for rejection" autoFocus/><div className="mt-4 flex justify-end gap-2"><button onClick={()=>setRejectTarget(null)} className="rounded-xl border border-black/10 px-4 py-2 text-sm text-slate-600">Cancel</button><button onClick={reject} disabled={!reason.trim()||busyId===rejectTarget._id} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm reject</button></div></div></div>}
  </div>);
}
