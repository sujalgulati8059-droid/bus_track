const express=require("express"),r=express.Router(),{getVapidPublicKey,subscribe,unsubscribe}=require("../controllers/notifyController");
r.get("/vapid-public-key",getVapidPublicKey);
r.post("/subscribe",subscribe);
r.post("/unsubscribe",unsubscribe);
module.exports=r;
