const mongoose=require("mongoose");
const daySchema=new mongoose.Schema({stops:{type:[String],default:[]},departureTime:{type:String,default:null},skip:{type:Boolean,default:false}},{_id:false});
const s=new mongoose.Schema({routeNo:{type:String,required:true,unique:true},routeName:{type:String,required:true},stops:{type:[String],required:true},departureTime:{type:String,default:"08:00"},isActive:{type:Boolean,default:true},color:{type:String,default:"#f97316"},region:{type:String,default:"OTHER"},capacity:{type:Number,default:40},schedule:{Mon:daySchema,Tue:daySchema,Wed:daySchema,Thu:daySchema,Fri:daySchema,Sat:daySchema,Sun:daySchema}},{timestamps:true});
s.index({stops:1,isActive:1});
module.exports=mongoose.model("Route",s);