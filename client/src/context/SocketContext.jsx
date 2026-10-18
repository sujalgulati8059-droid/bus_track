import React,{createContext,useContext,useEffect,useRef,useState}from"react";
import{io}from"socket.io-client";
const Ctx=createContext(null);
export function SocketProvider({children}){
  const ref=useRef(null);const[connected,setConnected]=useState(false);const[busPositions,setBusPositions]=useState([]);
  useEffect(()=>{ref.current=io(process.env.REACT_APP_SOCKET_URL||"http://localhost:5000",{withCredentials:true,reconnection:true,reconnectionAttempts:10,reconnectionDelay:2000,reconnectionDelayMax:15000});ref.current.on("connect",()=>setConnected(true));ref.current.on("disconnect",()=>setConnected(false));ref.current.on("bus-positions",d=>setBusPositions(d));ref.current.on("bus-status",status=>setBusPositions(current=>current.map(bus=>bus.routeNo===status.routeNo?{...bus,...status}:bus)));return()=>ref.current?.disconnect();},[]);
  return<Ctx.Provider value={{connected,busPositions,socket:ref.current}}>{children}</Ctx.Provider>;
}
export const useSocket=()=>useContext(Ctx);