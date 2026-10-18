const rateLimit=require("express-rate-limit");
const {normalizePhone}=require("../services/phoneService");
const ipLimit=rateLimit({windowMs:15*60*1000,max:30,standardHeaders:true,legacyHeaders:false,message:{success:false,error:"Too many requests; try again later"}});
const phoneLimit=rateLimit({
  windowMs:15*60*1000,
  max:20,
  standardHeaders:true,
  legacyHeaders:false,
  keyGenerator:req=>normalizePhone(req.body?.phone||req.query?.phone)||`invalid:${req.ip}`,
  message:{success:false,error:"Too many requests; try again later"}
});
module.exports=[ipLimit,phoneLimit];
