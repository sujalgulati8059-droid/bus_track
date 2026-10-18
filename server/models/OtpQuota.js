const mongoose=require("mongoose");
const s=new mongoose.Schema({
  phone:{type:String,required:true,unique:true},
  sends:{type:[new mongoose.Schema({sentAt:{type:Date,required:true},requestId:{type:String,required:true}},{_id:false})],default:[]},
  lastSentAt:Date,
  expiresAt:{type:Date,required:true}
},{timestamps:true});
s.index({expiresAt:1},{expireAfterSeconds:0});
module.exports=mongoose.model("OtpQuota",s);
