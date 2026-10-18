const mongoose=require("mongoose");
const s=new mongoose.Schema({
  phone:{type:String,required:true,index:true},
  purpose:{type:String,enum:["student_signup","driver_signup","driver_login","student_login"],required:true},
  hash:{type:String,required:true,select:false},
  expiresAt:{type:Date,required:true},
  attempts:{type:Number,default:0},
  resendAfter:{type:Date,required:true},
  consumed:{type:Boolean,default:false}
},{timestamps:true});
s.index({expiresAt:1},{expireAfterSeconds:0});
s.index({phone:1,purpose:1,createdAt:-1});
module.exports=mongoose.model("Otp",s);
