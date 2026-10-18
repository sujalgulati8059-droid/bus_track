const jwt=require("jsonwebtoken");
module.exports=(requireUidVerified=false)=>(req,res,next)=>{
  const token=req.headers.authorization?.startsWith("Bearer ")?req.headers.authorization.slice(7):null;
  if(!token)return res.status(401).json({success:false,error:"Signup token required"});
  try{
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    if(payload.purpose!=="student_signup"||!payload.phone||Boolean(payload.uidVerified)!==requireUidVerified)
      return res.status(401).json({success:false,error:"Invalid signup token"});
    req.signup=payload;
    next();
  }catch(error){return res.status(401).json({success:false,error:"Invalid or expired signup token"});}
};
