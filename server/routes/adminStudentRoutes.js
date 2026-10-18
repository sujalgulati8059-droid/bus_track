const express=require("express"),r=express.Router();
const{protect,restrictTo}=require("../middleware/authMiddleware");
const controller=require("../controllers/adminStudentController");
r.use(protect,restrictTo("admin","superadmin"));
r.post("/import",express.text({type:["text/csv","text/plain"],limit:"1mb"}),controller.importStudents);
r.get("/",controller.listStudents);
r.delete("/:id",controller.deleteStudent);
module.exports=r;
