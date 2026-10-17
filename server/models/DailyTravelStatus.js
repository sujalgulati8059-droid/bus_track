const mongoose=require("mongoose");
const s=new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
  date:{type:String,required:true}, // YYYY-MM-DD, local "today" string
  routeNo:{type:String,required:true},
  stop:{type:String,required:true},
  going:{type:Boolean,required:true},
  timestamp:{type:Date,default:Date.now}
},{timestamps:true});
s.index({user:1,date:1},{unique:true}); // prevents duplicate daily entries
s.index({routeNo:1,date:1,going:1}); // fast passenger-estimation aggregation
module.exports=mongoose.model("DailyTravelStatus",s);
