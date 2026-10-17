const webpush=require("web-push");
const PushSubscription=require("../models/PushSubscription");

const configured=!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY);
if(configured){webpush.setVapidDetails(process.env.VAPID_SUBJECT||"mailto:admin@cu.ac.in",process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);}

// Notifies every browser subscribed to a route that its running status changed.
// Silently no-ops if VAPID keys aren't set (e.g. local dev without push configured).
exports.notifyRouteStatus=async(routeNo,{isWorking,reason})=>{
  if(!configured)return;
  const subs=await PushSubscription.find({routeNo});
  if(!subs.length)return;
  const payload=JSON.stringify({
    title:isWorking?`Bus ${routeNo} is back on`:`Bus ${routeNo} is not running today`,
    body:isWorking?"The driver marked this route active again.":(reason||"The driver marked this route off for today."),
    routeNo,
  });
  await Promise.all(subs.map(async(sub)=>{
    try{
      await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},payload);
    }catch(e){
      if(e.statusCode===404||e.statusCode===410){await PushSubscription.deleteOne({_id:sub._id});} // subscription expired/revoked
    }
  }));
};
