import{useState,useEffect}from"react";
const KEY="btp_my_stop";
export default function useMyStop(){
  const[myStop,setMyStop]=useState(()=>localStorage.getItem(KEY)||null);
  const save=(stop)=>{localStorage.setItem(KEY,stop);setMyStop(stop);};
  const clear=()=>{localStorage.removeItem(KEY);setMyStop(null);};
  return{myStop,save,clear};
}