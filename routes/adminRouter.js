const express=require('express');
const router=express.Router();
const adminController=require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController");
const {userAuth,adminAuth}=require("../middlewares/auth");

/////login 
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/",adminAuth,adminController.loadDashboard);
router.get("/pageerror",adminController.pageerror)
router.get("/logout",adminAuth,adminController.logout)



////customer management
router.get("/users",adminAuth,customerController.customerInfo)




module.exports=router;
