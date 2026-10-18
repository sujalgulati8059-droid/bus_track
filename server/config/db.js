const mongoose=require("mongoose");
module.exports=async()=>{
  const c=await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB:",c.connection.host);
};
