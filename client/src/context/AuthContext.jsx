import React,{createContext,useContext,useState,useEffect,useCallback}from"react";
import api from"../utils/api";
const Ctx=createContext(null);
export function AuthProvider({children}){
  const[admin,setAdmin]=useState(()=>{try{return JSON.parse(localStorage.getItem("btp_admin"))}catch{return null}});
  const[loading,setLoading]=useState(true);
  useEffect(()=>{if(!localStorage.getItem("btp_token")){setLoading(false);return;}api.get("/auth/me").then(r=>setAdmin(r.data.data.admin)).catch(()=>{localStorage.removeItem("btp_token");localStorage.removeItem("btp_admin");}).finally(()=>setLoading(false));},[]);
  const login=useCallback(async(email,password)=>{const r=await api.post("/auth/login",{email,password});localStorage.setItem("btp_token",r.data.token);localStorage.setItem("btp_admin",JSON.stringify(r.data.data.admin));setAdmin(r.data.data.admin);return r.data.data.admin;},[]);
  const logout=useCallback(async()=>{await api.post("/auth/logout").catch(()=>{});localStorage.removeItem("btp_token");localStorage.removeItem("btp_admin");setAdmin(null);},[]);
  return<Ctx.Provider value={{admin,loading,login,logout,isAuthenticated:!!admin}}>{children}</Ctx.Provider>;
}
export const useAuth=()=>useContext(Ctx);