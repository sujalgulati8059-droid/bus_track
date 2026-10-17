import React,{useState}from"react";
import{Toaster}from"react-hot-toast";
import{AuthProvider,useAuth}from"./context/AuthContext";
import{SocketProvider}from"./context/SocketContext";
import Navbar from"./components/common/Navbar";
import ErrorBoundary from"./components/common/UI";
import HomePage from"./pages/HomePage";
import BusMap from"./components/map/BusMap";
import ParkingGrid from"./components/parking/ParkingGrid";
import AdminDashboard from"./components/admin/AdminDashboard";
import LoginPage from"./components/admin/LoginPage";
function AppContent(){
  const{isAuthenticated,loading}=useAuth();
  const[page,setPage]=useState("home");const[focusRoute,setFocusRoute]=useState(null);
  if(loading)return(<div className="min-h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-2 border-black/10 border-t-yellow-500 rounded-full animate-spin"/></div>);
  return(<div className="min-h-screen bg-white">
    <Navbar page={page} setPage={setPage}/>
    <main><ErrorBoundary key={page}>
      {page==="home"&&<HomePage onViewOnMap={b=>{setFocusRoute(b);setPage("map");}}/>}
      {page==="map"&&<BusMap focusRoute={focusRoute}/>}
      {page==="parking"&&<ParkingGrid/>}
      {page==="admin"&&(isAuthenticated?<AdminDashboard/>:<LoginPage onSuccess={()=>setPage("admin")}/>)}
    </ErrorBoundary></main>
    <Toaster position="top-right" toastOptions={{style:{background:"#ffffff",color:"#0f172a",border:"1px solid rgba(0,0,0,0.1)",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}}/>
  </div>);}
export default function App(){return(<AuthProvider><SocketProvider><AppContent/></SocketProvider></AuthProvider>);}
