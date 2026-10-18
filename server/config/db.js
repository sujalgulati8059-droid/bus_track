const mongoose=require("mongoose");
const User=require("../models/User");
const extraModels=[
  require("../models/Otp"),
  require("../models/StudentRecord"),
  require("../models/DriverRequest"),
];
module.exports=async()=>{
  const c=await mongoose.connect(process.env.MONGO_URI);
  const users=User.collection;
  const indexes=await users.indexes().catch(e=>{if(e.code===26)return[];throw e;});
  const emailIndex=indexes.find(i=>i.key&&i.key.email===1);
  if(emailIndex&&(!emailIndex.unique||!emailIndex.sparse))await users.dropIndex(emailIndex.name);
  await User.syncIndexes();
  await Promise.all(extraModels.map(m=>m.syncIndexes()));
  console.log("✅ MongoDB:",c.connection.host);
};
