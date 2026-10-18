const mongoose=require("mongoose");
const s=new mongoose.Schema({
  driver:{type:mongoose.Schema.Types.ObjectId,ref:"Driver",required:true},
  routeNo:{type:String,required:true},
  active:{type:Boolean,default:true},
  startedAt:{type:Date,default:Date.now},
  endedAt:Date
},{timestamps:true});
s.index({driver:1},{unique:true,partialFilterExpression:{active:true}});
s.index({routeNo:1},{unique:true,partialFilterExpression:{active:true}});
module.exports=mongoose.model("Trip",s);
