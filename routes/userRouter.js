const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userController")



//////////-----route to home
router.get("/pageNotFound",userController.pageNotFound)///(for error handling)
router.get("/",userController.loadHomepage),
router.get("/signup",userController.loadSignup),
router.get("/shop",userController.loadshopping)
router.post("/signup",userController.signup),
router.get("/verify-otp",userController.loadverifyotp),
router.post("/verify-otp",userController.verifyotp)
module.exports=router;