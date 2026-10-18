const mongoose=require("mongoose");
const s=new mongoose.Schema({
  name:{type:String,required:true,trim:true},
  phone:{type:String,required:true},
  requestedRoute:{type:String,required:true},
  status:{type:String,enum:["pending","approved","rejected"],default:"pending"},
  rejectReason:{type:String,default:""},
  reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:"Admin"},
  reviewedAt:Date,
  phoneVerified:{type:Boolean,required:true,default:true}
},{timestamps:true});
s.index({phone:1},{unique:true,partialFilterExpression:{status:"pending"}});
module.exports=mongoose.model("DriverRequest",s);
