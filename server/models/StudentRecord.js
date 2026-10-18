const mongoose=require("mongoose");
const s=new mongoose.Schema({
  uid:{type:String,required:true,unique:true,trim:true,uppercase:true},
  name:{type:String,required:true,trim:true},
  isActive:{type:Boolean,default:true}
},{timestamps:true});
module.exports=mongoose.model("StudentRecord",s);
