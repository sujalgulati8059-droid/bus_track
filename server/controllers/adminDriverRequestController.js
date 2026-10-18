const Driver=require("../models/Driver");
const DriverRequest=require("../models/DriverRequest");
const Route=require("../models/Route");
const mongoose=require("mongoose");

exports.listRequests=async(req,res,next)=>{
  try{
    const status=req.query.status||"pending";
    if(!["pending","approved","rejected"].includes(status))return res.status(400).json({success:false,error:"Invalid request status"});
    const requests=await DriverRequest.find({status}).sort({createdAt:1}).lean();
    res.json({success:true,count:requests.length,data:requests});
  }catch(error){next(error);}
};
exports.approveRequest=async(req,res,next)=>{
  let createdDriver;
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({success:false,error:"Invalid driver request ID"});
    const body=req.body||{};
    if(body.routeNo!==undefined&&typeof body.routeNo!=="string")return res.status(400).json({success:false,error:"routeNo must be a string"});
    const request=await DriverRequest.findById(req.params.id);
    if(!request)return res.status(404).json({success:false,error:"Driver request not found"});
    if(request.status!=="pending")return res.status(409).json({success:false,error:"Request has already been reviewed"});
    const routeNo=typeof body.routeNo==="string"?body.routeNo.trim().toUpperCase():request.requestedRoute;
    const route=await Route.findOne({routeNo,isActive:true});
    if(!route)return res.status(400).json({success:false,error:"Selected route does not exist"});
    createdDriver=await Driver.create({name:request.name,phone:request.phone,routeNo:route.routeNo,isActive:true});
    const update=await DriverRequest.updateOne({_id:request._id,status:"pending"},{$set:{status:"approved",reviewedBy:req.admin._id,reviewedAt:new Date()}});
    if(update.modifiedCount!==1){
      await Driver.deleteOne({_id:createdDriver._id});
      return res.status(409).json({success:false,error:"Request has already been reviewed"});
    }
    res.json({success:true,message:"Driver approved",data:{driver:createdDriver,requestId:request._id}});
  }catch(error){
    if(createdDriver){
      try{await Driver.deleteOne({_id:createdDriver._id});}
      catch(rollbackError){
        console.error("Driver approval rollback failed:",rollbackError.message);
        return res.status(500).json({success:false,error:"Approval failed and cleanup could not be confirmed"});
      }
    }
    if(error.code===11000)return res.status(409).json({success:false,error:"A driver with this phone already exists"});
    next(error);
  }
};
exports.rejectRequest=async(req,res,next)=>{
  try{
    if(!mongoose.Types.ObjectId.isValid(req.params.id))return res.status(400).json({success:false,error:"Invalid driver request ID"});
    const reason=typeof req.body?.reason==="string"?req.body.reason.trim():"";
    if(!reason||reason.length>500)return res.status(400).json({success:false,error:"A rejection reason of 1-500 characters is required"});
    const request=await DriverRequest.findOneAndUpdate({_id:req.params.id,status:"pending"},{$set:{status:"rejected",rejectReason:reason,reviewedBy:req.admin._id,reviewedAt:new Date()}},{new:true});
    if(!request)return res.status(404).json({success:false,error:"Pending driver request not found"});
    res.json({success:true,data:request});
  }catch(error){next(error);}
};
