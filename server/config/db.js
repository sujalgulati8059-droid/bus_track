const mongoose=require("mongoose");
const User=require("../models/User");
const newModels=[
  require("../models/Otp"),
  require("../models/OtpQuota"),
  require("../models/StudentRecord"),
  require("../models/DriverRequest"),
  require("../models/Trip")
];
module.exports=async()=>{
  const c=await mongoose.connect(process.env.MONGO_URI);
  const users=User.collection;
  const indexes=await users.indexes().catch(error=>{if(error.code===26)return[];throw error;});
  const emailIndex=indexes.find(index=>index.key&&index.key.email===1);
  if(emailIndex&&(!emailIndex.unique||!emailIndex.sparse))await users.dropIndex(emailIndex.name);
  await User.createIndexes();
  await Promise.all(newModels.map(model=>model.createIndexes()));
  console.log("✅ MongoDB:",c.connection.host);
};