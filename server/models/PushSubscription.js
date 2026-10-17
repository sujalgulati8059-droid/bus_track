const mongoose=require("mongoose");
const s=new mongoose.Schema({routeNo:{type:String,required:true},endpoint:{type:String,required:true},keys:{p256dh:{type:String,required:true},auth:{type:String,required:true}}},{timestamps:true});
s.index({routeNo:1});
s.index({endpoint:1,routeNo:1},{unique:true});
module.exports=mongoose.model("PushSubscription",s);
