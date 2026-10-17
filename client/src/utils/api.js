import axios from"axios";
// Dev: leave REACT_APP_API_URL empty and the "proxy" in package.json forwards /api to localhost:5000.
// Production: set REACT_APP_API_URL to your backend URL (no trailing slash).
const base=(process.env.REACT_APP_API_URL||"").replace(/\/+$/,"");
const api=axios.create({baseURL:`${base}/api`,withCredentials:true,timeout:15000});
api.interceptors.request.use(cfg=>{
  const t=localStorage.getItem("btp_token");
  if(t)cfg.headers.Authorization=`Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(r=>r,err=>{
  if(err.response?.status===401){localStorage.removeItem("btp_token");localStorage.removeItem("btp_admin");}
  return Promise.reject(err);
});
export default api;
