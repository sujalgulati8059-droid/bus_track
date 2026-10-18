const mongoose=require("mongoose"),bcrypt=require("bcryptjs");
const s=new mongoose.Schema({
  name:{type:String,required:true,trim:true},
  uid:{type:String,required:true,unique:true,trim:true,uppercase:true},
  email:{type:String,lowercase:true,trim:true,default:undefined},
  phone:{type:String,required:true,trim:true},
  password:{type:String,select:false,minlength:6},
  role:{type:String,enum:["student","faculty"],required:true},
  assignedRoute:{type:String,required:true},
  assignedStop:{type:String,required:true},
  assignedStops:{type:[String],default:[]},
  isActive:{type:Boolean,default:true},
  lastLogin:Date
},{timestamps:true,autoIndex:false});
s.index({assignedRoute:1});
s.index({email:1},{unique:true,sparse:true});
s.pre("validate",function(next){
  if(Boolean(this.email)!==Boolean(this.password))return next(new Error("Email and password must be provided together"));
  next();
});
s.pre("save",async function(next){if(!this.isModified("password")||!this.password)return next();this.password=await bcrypt.hash(this.password,12);next();});
s.methods.comparePassword=async function(p){return bcrypt.compare(p,this.password);};
module.exports=mongoose.model("User",s);
