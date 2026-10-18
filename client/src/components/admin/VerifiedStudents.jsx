import React,{useCallback,useEffect,useMemo,useState}from"react";
import toast from"react-hot-toast";
import api from"../../utils/api";
import{LoadingSpinner}from"../common/UI";

const parsePastedRows=text=>{
  const lines=text.trim().split(/\r?\n/).filter(Boolean);
  if(!lines.length)return[];
  const delimiter=lines[0].includes("\t")?"\t":",";
  const rows=lines.map(line=>{
    if(delimiter==="\t")return line.split("\t").map(value=>value.trim());
    const fields=[];let field="",quoted=false;
    for(let index=0;index<line.length;index++){
      const char=line[index];
      if(char==='"'&&line[index+1]==='"'){field+='"';index++;}
      else if(char==='"')quoted=!quoted;
      else if(char===","&&!quoted){fields.push(field.trim());field="";}
      else field+=char;
    }
    fields.push(field.trim());return fields;
  });
  if(rows[0]?.[0]?.toLowerCase()==="uid")rows.shift();
  return rows.map(([uid,name])=>({uid,name}));
};
const readFile=file=>new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||""));
  reader.onerror=()=>reject(new Error("Could not read the selected file"));
  reader.readAsText(file);
});

export default function VerifiedStudents(){
  const[students,setStudents]=useState([]);const[loading,setLoading]=useState(false);const[search,setSearch]=useState("");const[paste,setPaste]=useState("");const[uploading,setUploading]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);
    try{const response=await api.get("/admin/students");setStudents(response.data.data||[]);}
    catch(error){toast.error(error.response?.data?.error||"Could not load verified students");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const filtered=useMemo(()=>students.filter(student=>student.uid.toLowerCase().includes(search.trim().toLowerCase())),[students,search]);
  const importRows=async rows=>{
    if(!rows.length){toast.error("Choose or paste a CSV list with uid and name");return;}
    setUploading(true);
    try{
      const response=await api.post("/admin/students/import",rows);
      toast.success(`${response.data.imported} student record${response.data.imported===1?"":"s"} imported`);
      setPaste("");await load();
    }catch(error){toast.error(error.response?.data?.error||"Could not import student list");}
    finally{setUploading(false);}
  };
  const uploadFile=async event=>{
    const file=event.target.files?.[0];event.target.value="";
    if(!file)return;
    if(!/\.(csv|txt)$/i.test(file.name)){toast.error("Please upload a CSV file or paste Excel cells below");return;}
    try{await importRows(parsePastedRows(await readFile(file)));}
    catch(error){toast.error(error.message||"Could not read CSV");}
  };
  const remove=async student=>{
    if(!window.confirm(`Delete verified UID ${student.uid}?`))return;
    const previous=students;setStudents(current=>current.filter(item=>item._id!==student._id));
    try{await api.delete(`/admin/students/${student._id}`);toast.success(`${student.uid} deleted`);}
    catch(error){setStudents(previous);toast.error(error.response?.data?.error||"Could not delete student record");}
  };
  const downloadSample=()=>{
    const blob=new Blob(["uid,name\r\nSTU001,Sample Student\r\n"],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url;anchor.download="verified-students-sample.csv";anchor.click();URL.revokeObjectURL(url);
  };

  return(<div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-black">Verified Students</h3><p className="mt-1 text-xs text-slate-500">{students.length} records available for UID verification</p></div><button onClick={downloadSample} className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-yellow-500/50 hover:text-black">Download sample CSV</button></div>
    <div className="glass space-y-3 rounded-2xl border border-black/10 p-4"><label className="block text-xs font-semibold uppercase text-slate-500">Upload CSV or paste CSV / Excel cells (uid, name)</label><input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={uploadFile} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-yellow-400 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black"/><textarea value={paste} onChange={event=>setPaste(event.target.value)} rows={4} placeholder={"uid,name\nSTU001,Sample Student"} className="field w-full resize-y font-mono text-xs"/><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-500">Paste directly from Excel; tab-separated columns are supported.</span><button disabled={uploading||!paste.trim()} onClick={()=>importRows(parsePastedRows(paste))} className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-500 disabled:opacity-50">{uploading?"Importing...":"Import pasted list"}</button></div></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search UID..." className="field w-full max-w-xs text-sm py-2"/><span className="text-xs text-slate-500">Showing {filtered.length} of {students.length}</span></div>
    {loading&&students.length===0?<LoadingSpinner text="Loading student records..."/>:<div className="glass overflow-hidden rounded-2xl border border-black/10"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-black/8">{["UID","Name","Added",""].map(label=><th key={label} className="px-4 py-3 text-left text-xs uppercase text-slate-500">{label}</th>)}</tr></thead><tbody>{filtered.map((student,index)=><tr key={student._id} className={`border-b border-black/5 ${index%2?"bg-black/1":""}`}><td className="px-4 py-3 font-mono text-xs font-semibold text-yellow-800">{student.uid}</td><td className="px-4 py-3 text-xs text-slate-700">{student.name}</td><td className="px-4 py-3 text-xs text-slate-500">{student.createdAt?new Date(student.createdAt).toLocaleDateString():"-"}</td><td className="px-4 py-3 text-right"><button onClick={()=>remove(student)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button></td></tr>)}{filtered.length===0&&<tr><td colSpan={4} className="px-4 py-10 text-center text-xs text-slate-500">{students.length?"No matching UID":"No verified student records yet"}</td></tr>}</tbody></table></div></div>}
  </div>);
}
