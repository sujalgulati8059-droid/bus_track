const User=require("../models/User"),Route=require("../models/Route"),DailyTravelStatus=require("../models/DailyTravelStatus"),{sendUserTokenResponse}=require("../services/authService");

const today=()=>new Date().toISOString().slice(0,10); // YYYY-MM-DD

exports.register=async(req,res,next)=>{
  try{
    const{name,uid,email,phone,password,role,assignedRoute,assignedStop}=req.body;
    if(!name||!uid||!email||!phone||!password||!role||!assignedRoute||!assignedStop)
      return res.status(400).json({success:false,error:"All fields are required"});
    if(!["student","faculty"].includes(role))
      return res.status(400).json({success:false,error:"Role must be student or faculty"});
    const route=await Route.findOne({routeNo:assignedRoute.toUpperCase(),isActive:true});
    if(!route)return res.status(400).json({success:false,error:"Selected route does not exist"});
    if(!route.stops.includes(assignedStop))
      return res.status(400).json({success:false,error:"Selected stop is not on that route"});
    const user=await User.create({name,uid:uid.toUpperCase(),email:email.toLowerCase(),phone,password,role,assignedRoute:route.routeNo,assignedStop});
    sendUserTokenResponse(user,201,res);
  }catch(e){
    if(e.code===11000){const field=Object.keys(e.keyPattern||{})[0]||"field";return res.status(400).json({success:false,error:`That ${field} is already registered`});}
    next(e);
  }
};

exports.login=async(req,res,next)=>{
  try{
    const{email,password}=req.body;
    if(!email||!password)return res.status(400).json({success:false,error:"Email and password required"});
    const user=await User.findOne({email:email.toLowerCase()}).select("+password");
    if(!user||!user.isActive||!(await user.comparePassword(password)))
      return res.status(401).json({success:false,error:"Invalid email or password"});
    user.lastLogin=new Date();await user.save({validateBeforeSave:false});
    sendUserTokenResponse(user,200,res);
  }catch(e){next(e);}
};

exports.logout=(req,res)=>{res.cookie("userJwt","loggedout",{expires:new Date(Date.now()+5000),httpOnly:true});res.json({success:true,message:"Logged out"});};

exports.getMe=async(req,res,next)=>{try{res.json({success:true,data:{user:req.user}});}catch(e){next(e);}};

exports.updateProfile=async(req,res,next)=>{
  try{
    const{phone,assignedStop}=req.body;const updates={};
    if(phone)updates.phone=phone;
    if(assignedStop){
      const route=await Route.findOne({routeNo:req.user.assignedRoute});
      if(!route||!route.stops.includes(assignedStop))
        return res.status(400).json({success:false,error:"Stop is not on your assigned route"});
      updates.assignedStop=assignedStop;
    }
    const user=await User.findByIdAndUpdate(req.user._id,updates,{new:true,runValidators:true});
    res.json({success:true,data:{user}});
  }catch(e){next(e);}
};

// POST /api/student/travel-status  { going, stop? }  — upsert, one row per user per day
exports.setTravelStatus=async(req,res,next)=>{
  try{
    const{going,stop}=req.body;
    if(typeof going!=="boolean")return res.status(400).json({success:false,error:"'going' must be true or false"});
    const boardingStop=stop||req.user.assignedStop;
    if(going){
      const route=await Route.findOne({routeNo:req.user.assignedRoute});
      if(!route||!route.stops.includes(boardingStop))
        return res.status(400).json({success:false,error:"Boarding stop is not on your assigned route"});
    }
    const status=await DailyTravelStatus.findOneAndUpdate(
      {user:req.user._id,date:today()},
      {user:req.user._id,date:today(),routeNo:req.user.assignedRoute,stop:boardingStop,going,timestamp:new Date()},
      {upsert:true,new:true,runValidators:true}
    );
    const io=req.app.get("io");
    if(io)io.to(`route_${req.user.assignedRoute}`).emit("passenger-status-change",{routeNo:req.user.assignedRoute,stop:boardingStop,going});
    res.json({success:true,data:{status}});
  }catch(e){next(e);}
};

exports.getTodayStatus=async(req,res,next)=>{
  try{
    const status=await DailyTravelStatus.findOne({user:req.user._id,date:today()});
    res.json({success:true,data:{status:status||null}});
  }catch(e){next(e);}
};

// GET /api/student/travel-status/route/:routeNo — passenger estimate per stop, for today
exports.getRouteEstimate=async(req,res,next)=>{
  try{
    const routeNo=req.params.routeNo.toUpperCase();
    const rows=await DailyTravelStatus.aggregate([
      {$match:{routeNo,date:today(),going:true}},
      {$group:{_id:"$stop",count:{$sum:1}}}
    ]);
    const byStop=Object.fromEntries(rows.map(r=>[r._id,r.count]));
    const total=rows.reduce((a,r)=>a+r.count,0);
    res.json({success:true,data:{routeNo,total,byStop}});
  }catch(e){next(e);}
};
