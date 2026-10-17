require("dotenv").config();
const mongoose=require("mongoose"),Driver=require("../models/Driver"),Route=require("../models/Route");
// Usage: node config/createDriver.js "Driver Name" phone password routeNo
async function run(){const[,,name,phone,password,routeNo]=process.argv;if(!name||!phone||!password||!routeNo){console.log('Usage: node config/createDriver.js "Name" phone password routeNo');return process.exit(1);}await mongoose.connect(process.env.MONGO_URI);const route=await Route.findOne({routeNo});if(!route){console.log("No route with routeNo:",routeNo);return process.exit(1);}const existing=await Driver.findOne({phone});if(existing){console.log("Driver already exists:",existing.phone);return process.exit(0);}const d=await Driver.create({name,phone,password,routeNo});console.log("Driver created:",d.name,d.phone,"assigned to route",routeNo);process.exit(0);}
run().catch(e=>{console.error(e.message);process.exit(1);});
