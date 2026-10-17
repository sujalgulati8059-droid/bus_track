const mongoose=require("mongoose"),bcrypt=require("bcryptjs");
const s=new mongoose.Schema({name:{type:String,required:true},phone:{type:String,required:true,unique:true},email:{type:String,lowercase:true},password:{type:String,required:true,select:false},routeNo:{type:String,required:true},isActive:{type:Boolean,default:true},lastLogin:Date},{timestamps:true});
s.pre("save",async function(next){if(!this.isModified("password"))return next();this.password=await bcrypt.hash(this.password,12);next();});
s.methods.comparePassword=async function(p){return bcrypt.compare(p,this.password);};
module.exports=mongoose.model("Driver",s);
