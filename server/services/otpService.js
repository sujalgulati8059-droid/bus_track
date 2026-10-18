const bcrypt=require("bcryptjs");
const crypto=require("crypto");
const mongoose=require("mongoose");
const Otp=require("../models/Otp");
const OtpQuota=require("../models/OtpQuota");
const {normalizePhone}=require("./phoneService");
const OTP_EXPIRY_MIN=Math.max(1,Number(process.env.OTP_EXPIRY_MIN)||5);
const MINUTE=60*1000;
const HOUR=60*MINUTE;

const reserveHourlySend=async(phone,now)=>{
  const requestId=new mongoose.Types.ObjectId().toString();
  const cutoff=new Date(now.getTime()-HOUR);
  const cooldownCutoff=new Date(now.getTime()-30*1000);
  const pipeline=[
    {$set:{
      sends:{$filter:{input:{$ifNull:["$sends",[]]},as:"send",cond:{$gt:["$$send.sentAt",{$literal:cutoff}]}}},
      expiresAt:{$literal:new Date(now.getTime()+HOUR)}
    }},
    {$set:{
      canSend:{$and:[
        {$lt:[{$size:"$sends"},5]},
        {$or:[{$eq:[{$ifNull:["$lastSentAt",null]},null]},{$lte:["$lastSentAt",{$literal:cooldownCutoff}]}]}
      ]}
    }},
    {$set:{
      sends:{$cond:["$canSend",{$concatArrays:["$sends",[{$literal:{sentAt:now,requestId}}]]},"$sends"]},
      lastSentAt:{$cond:["$canSend",{$literal:now},"$lastSentAt"]}
    }},
    {$unset:"canSend"}
  ];
  let quota;
  try{
    quota=await OtpQuota.findOneAndUpdate({phone},pipeline,{new:true,upsert:true});
  }catch(error){
    if(error.code!==11000)throw error;
    quota=await OtpQuota.findOneAndUpdate({phone},pipeline,{new:true});
  }
  if(!quota?.sends.some(send=>send.requestId===requestId)){
    const cooldownActive=quota?.lastSentAt&&quota.lastSentAt>cooldownCutoff;
    const message=cooldownActive?"Please wait before requesting another OTP":"OTP limit reached; try again later";
    throw Object.assign(new Error(message),{statusCode:429});
  }
};

const sendSms=async(phone,text)=>{
  const provider=process.env.SMS_PROVIDER||"console";
  if(provider==="console"){
    console.log(`[SMS console] ${phone}: ${text}`);
    return;
  }
  if(provider==="msg91"){
    if(!process.env.MSG91_AUTH_KEY||!process.env.MSG91_TEMPLATE_ID)throw new Error("MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required");
    const code=text.match(/\b\d{6}\b/)?.[0];
    if(!code)throw new Error("Unable to prepare SMS template parameters");
    const response=await fetch("https://control.msg91.com/api/v5/flow/",{
      method:"POST",
      headers:{"Content-Type":"application/json","authkey":process.env.MSG91_AUTH_KEY},
      body:JSON.stringify({template_id:process.env.MSG91_TEMPLATE_ID,recipients:[{mobiles:phone.replace("+",""),OTP:code}]})
    });
    if(!response.ok)throw new Error(`MSG91 SMS failed (${response.status})`);
    return;
  }
  if(provider==="twilio"){
    if(!process.env.TWILIO_SID||!process.env.TWILIO_TOKEN||!process.env.TWILIO_FROM)throw new Error("TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM are required");
    const credentials=Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_TOKEN}`).toString("base64");
    const body=new URLSearchParams({To:phone,From:process.env.TWILIO_FROM,Body:text});
    const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(process.env.TWILIO_SID)}/Messages.json`,{
      method:"POST",headers:{Authorization:`Basic ${credentials}`,"Content-Type":"application/x-www-form-urlencoded"},body
    });
    if(!response.ok)throw new Error(`Twilio SMS failed (${response.status})`);
    return;
  }
  throw new Error(`Unsupported SMS_PROVIDER: ${provider}`);
};

exports.sendSms=sendSms;
exports.normalizePhone=normalizePhone;
exports.sendOtp=async(phone,purpose)=>{
  const normalized=normalizePhone(phone);
  if(!normalized)throw Object.assign(new Error("Enter a valid Indian mobile number"),{statusCode:400});
  const now=new Date();
  await reserveHourlySend(normalized,now);
  const otp=String(crypto.randomInt(100000,1000000));
  const hash=await bcrypt.hash(otp,12);
  const expiresAt=new Date(now.getTime()+OTP_EXPIRY_MIN*MINUTE);
  const record=await Otp.create({phone:normalized,purpose,hash,expiresAt,attempts:0,resendAfter:new Date(now.getTime()+30*1000)});
  try{
    await sendSms(normalized,`Your BusTrack Pro verification code is ${otp}. It expires in ${OTP_EXPIRY_MIN} minutes.`);
  }catch(error){
    await Otp.deleteOne({_id:record._id});
    throw error;
  }
  return {phone:normalized,devOtp:(process.env.SMS_PROVIDER||"console")==="console"&&process.env.NODE_ENV!=="production"?otp:undefined};
};
exports.verifyOtp=async(phone,purpose,otp)=>{
  const normalized=normalizePhone(phone);
  if(!normalized||typeof otp!=="string"||!/^\d{6}$/.test(otp))return false;
  const record=await Otp.findOne({phone:normalized,purpose,consumed:false,expiresAt:{$gt:new Date()},attempts:{$lt:5}}).select("+hash").sort({createdAt:-1});
  if(!record)return false;
  if(!(await bcrypt.compare(otp,record.hash))){
    await Otp.updateOne({_id:record._id,consumed:false,attempts:{$lt:5}},{$inc:{attempts:1}});
    return false;
  }
  const consumed=await Otp.updateOne({_id:record._id,consumed:false,attempts:{$lt:5},expiresAt:{$gt:new Date()}},{$set:{consumed:true}});
  return consumed.modifiedCount===1;
};
