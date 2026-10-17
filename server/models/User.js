const mongoose=require("mongoose"),bcrypt=require("bcryptjs");
const s=new mongoose.Schema({
  name:{type:String,required:true,trim:true},
  uid:{type:String,required:true,unique:true,trim:true,uppercase:true},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  phone:{type:String,required:true,trim:true},
  password:{type:String,required:true,select:false,minlength:6},
  role:{type:String,enum:["student","faculty"],required:true},
  assignedRoute:{type:String,required:true},
  assignedStop:{type:String,required:true},
  isActive:{type:Boolean,default:true},
  lastLogin:Date
},{timestamps:true});
s.index({assignedRoute:1});
s.pre("save",async function(next){if(!this.isModified("password"))return next();this.password=await bcrypt.hash(this.password,12);next();});
s.methods.comparePassword=async function(p){return bcrypt.compare(p,this.password);};
module.exports=mongoose.model("User",s);
