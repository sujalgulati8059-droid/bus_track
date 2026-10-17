const mongoose=require("mongoose"),bcrypt=require("bcryptjs");
const s=new mongoose.Schema({name:{type:String,required:true},email:{type:String,required:true,unique:true,lowercase:true},password:{type:String,required:true,select:false},role:{type:String,enum:["admin","superadmin"],default:"admin"},isActive:{type:Boolean,default:true},lastLogin:Date},{timestamps:true});
s.pre("save",async function(next){if(!this.isModified("password"))return next();this.password=await bcrypt.hash(this.password,12);next();});
s.methods.comparePassword=async function(p){return bcrypt.compare(p,this.password);};
module.exports=mongoose.model("Admin",s);