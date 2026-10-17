import React,{useState}from"react";import{useAuth}from"../../context/AuthContext";
export default function LoginPage({onSuccess}){
  const{login}=useAuth();const[email,setEmail]=useState("admin@cu.ac.in");const[pwd,setPwd]=useState("");const[loading,setLoading]=useState(false);const[err,setErr]=useState("");
  const submit=async e=>{e.preventDefault();if(!email||!pwd)return setErr("Email and password required");setLoading(true);setErr("");try{await login(email,pwd);onSuccess?.();}catch(e){setErr(e.response?.data?.error||"Login failed");}finally{setLoading(false);};};
  return(<div className="min-h-[80vh] flex items-center justify-center px-4"><div className="w-full max-w-sm"><div className="glass rounded-3xl p-8 border border-black/10 shadow-2xl"><div className="text-center mb-8"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/40"><span className="text-black font-bold text-2xl">A</span></div><h1 className="font-bold text-2xl text-black">Admin Login</h1><p className="text-slate-500 text-sm mt-1">CU BusTrack Pro</p></div>
    <form onSubmit={submit} className="space-y-4">
      <div><label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="field" autoComplete="email"/></div>
      <div><label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Password</label><input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••••" className="field"/></div>
      {err&&<p className="text-red-600 text-sm">! {err}</p>}
      <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/40 disabled:opacity-60">{loading?"Logging in...":"Login to Dashboard"}</button>
    </form>
  </div></div></div>);}