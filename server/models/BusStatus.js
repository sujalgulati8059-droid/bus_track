const mongoose=require("mongoose");
const s=new mongoose.Schema({routeNo:{type:String,required:true},date:{type:String,required:true},isWorking:{type:Boolean,default:true},reason:{type:String,default:""},driver:{type:mongoose.Schema.Types.ObjectId,ref:"Driver"}},{timestamps:true});
s.index({routeNo:1,date:1},{unique:true});
module.exports=mongoose.model("BusStatus",s);
