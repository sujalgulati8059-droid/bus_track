import React,{useState}from"react";import{useAuth}from"../../context/AuthContext";
export default function Navbar({page,setPage}){
  const{admin,logout,isAuthenticated}=useAuth();
  const[open,setOpen]=useState(false);
  const nav=[{k:"home",l:"Search"},{k:"map",l:"Live Map"},{k:"parking",l:"Parking"},...(isAuthenticated?[{k:"admin",l:"Dashboard"}]:[])];
  return(<nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-black/8">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <button onClick={()=>setPage("home")} className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center"><span className="text-black text-xs font-bold">CU</span></div><span className="font-bold text-black text-lg hidden sm:block">BusTrack <span className="text-yellow-700">Pro</span></span></button>
      <div className="hidden md:flex items-center gap-1">{nav.map(n=>(<button key={n.k} onClick={()=>setPage(n.k)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${page===n.k?"bg-yellow-400/20 text-yellow-700 border border-yellow-500/50":"text-slate-500 hover:text-black hover:bg-black/5"}`}>{n.l}</button>))}</div>
      <div className="flex items-center gap-2">
        {isAuthenticated?(<div className="flex items-center gap-2"><span className="hidden sm:block text-xs text-slate-500">{admin?.name}</span><button onClick={logout} className="text-xs px-3 py-1.5 rounded-xl bg-red-100 border border-red-300 text-red-600 hover:bg-red-200 transition-all">Logout</button></div>):(<button onClick={()=>setPage("admin")} className="text-xs px-3 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-500/50 text-yellow-700 hover:bg-yellow-400/20 transition-all">Admin</button>)}
        <button className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-black/5" onClick={()=>setOpen(!open)}>{open?"X":"="}</button>
      </div>
    </div>
    {open&&(<div className="md:hidden glass border-t border-black/8 px-4 py-3 flex flex-col gap-1">{nav.map(n=>(<button key={n.k} onClick={()=>{setPage(n.k);setOpen(false);}} className={`px-4 py-2.5 rounded-xl text-sm text-left transition-all ${page===n.k?"bg-yellow-400/20 text-yellow-700":"text-slate-500 hover:text-black"}`}>{n.l}</button>))}</div>)}
  </nav>);}
