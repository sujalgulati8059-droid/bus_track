const StudentRecord=require("../models/StudentRecord");
const mongoose=require("mongoose");

const parseCsv=text=>{
  const rows=[];let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted&&char==='"'&&text[i+1]==='"'){field+='"';i++;}
    else if(char==='"')quoted=!quoted;
    else if(char===","&&!quoted){row.push(field.trim());field="";}
    else if((char==="\n"||char==="\r")&&!quoted){
      if(char==="\r"&&text[i+1]==="\n")i++;
      row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field="";
    }else field+=char;
  }
  row.push(field.trim());if(row.some(Boolean))rows.push(row);
  if(rows[0]?.[0]?.toLowerCase()==="uid")rows.shift();
  return rows.map(([uid,name])=>({uid,name}));
};
const normalizeRows=body=>{
  const rows=typeof body==="string"?parseCsv(body):body;
  if(!Array.isArray(rows)||rows.length<1||rows.length>10000)throw Object.assign(new Error("Provide a JSON array or CSV with uid and name"),{statusCode:400});
  return rows.map((record,index)=>{
    const uid=typeof record?.uid==="string"?record.uid.trim().toUpperCase():"";
    const name=typeof record?.name==="string"?record.name.trim():"";
    if(!/^[A-Z0-9-]{3,40}$/.test(uid)||!name||name.length>100)throw Object.assign(new Error(`Invalid UID or name at row ${index+1}`),{statusCode:400});
    return{uid,name,isActive:true};
  });
};
exports.importStudents=async(req,res,next)=>{
  try{
    const records=normalizeRows(req.body);
    const unique=new Set(records.map(r=>r.uid));
    if(unique.size!==records.length)return res.status(400).json({success:false,error:"Import contains duplicate UIDs"});
    const result=await StudentRecord.bulkWrite(records.map(record=>({updateOne:{filter:{uid:record.uid},update:{$set:record},upsert:true}})),{ordered:true});
    res.json({success:true,imported:records.length,created:result.upsertedCount,updated:result.modifiedCount});
  }catch(error){if(error.statusCode)return res.status(error.statusCode).json({success:false,error:error.message});next(error);}
};
exports.listStudents=async(req,res,next)=>{
  try{const students=await StudentRecord.find().sort({uid:1}).lean();res.json({success:true,count:students.length,data:students});}
  catch(error){next(error);}
};
exports.deleteStudent=async(req,res,next)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({success:false,error:"Invalid student record ID"});
    const student=await StudentRecord.findByIdAndDelete(req.params.id);
    if(!student)return res.status(404).json({success:false,error:"Student record not found"});
    res.json({success:true,message:"Student record deleted"});
  }catch(error){next(error);}
};
