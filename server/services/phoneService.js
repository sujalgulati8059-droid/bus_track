exports.normalizePhone=phone=>{
  if(typeof phone!=="string")return null;
  const value=phone.trim().replace(/[\s()-]/g,"");
  const digits=value.startsWith("+")?value.slice(1):value;
  if(!/^(?:91)?[6-9]\d{9}$/.test(digits))return null;
  return `+91${digits.slice(-10)}`;
};
