const PushSubscription=require("../models/PushSubscription");

exports.getVapidPublicKey=(req,res)=>{res.json({success:true,publicKey:process.env.VAPID_PUBLIC_KEY||null});};

exports.subscribe=async(req,res,next)=>{try{const{routeNo,subscription}=req.body;if(!routeNo||!subscription?.endpoint||!subscription?.keys?.p256dh||!subscription?.keys?.auth)return res.status(400).json({success:false,error:"routeNo and a valid push subscription are required"});await PushSubscription.findOneAndUpdate({endpoint:subscription.endpoint,routeNo},{keys:subscription.keys},{upsert:true,setDefaultsOnInsert:true});res.json({success:true});}catch(e){next(e);}};

exports.unsubscribe=async(req,res,next)=>{try{const{endpoint,routeNo}=req.body;if(!endpoint)return res.status(400).json({success:false,error:"endpoint required"});await PushSubscription.deleteMany(routeNo?{endpoint,routeNo}:{endpoint});res.json({success:true});}catch(e){next(e);}};
