const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userController");
const passport = require("passport");



//////////-----route to home
router.get("/pageNotFound",userController.pageNotFound)///(for error handling)
router.get("/",userController.loadHomepage),
router.get("/signup",userController.loadSignup),
router.get("/shop",userController.loadshopping)
router.post("/signup",userController.signup),
router.get("/verify-otp",userController.loadverifyotp),
router.post("/verify-otp",userController.verifyotp),
router.post("/resend-otp",userController.resendOtp),



router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

router.get("/login",userController.loadLogin)
router.post("/login",userController.login);
router.get("/logout",userController.logout)

///user products
router.get('/productDetail',userController.productDetail)

module.exports=router;