const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userController");
const passport = require("passport");
const { profileAuth,userAuth } = require("../middlewares/auth");



//////////-----route to home
router.get("/pageNotFound",userController.pageNotFound)///(for error handling)
router.get("/",userAuth,userController.loadHomepage),
router.get("/signup",userController.loadSignup),
router.get("/shop",userController.loadshopping)
router.post("/signup",userController.signup),
router.get("/verify-otp",userController.loadverifyotp),
router.post("/verify-otp",userController.verifyotp),
router.post("/resend-otp",userController.resendOtp),


userAuth,
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

router.get("/login",userController.loadLogin)
router.post("/login",userController.login);
router.get("/logout",userController.logout)

///user products
router.get('/productDetail/:id',userAuth,userController.productDetail)


///user profile
router.get('/profile',profileAuth,userAuth,userController.profile)
router.get('/address',userAuth,userController.address)
router.get('/cart',userAuth,userController.cart)
router.get('/wishlist',userAuth,userController.wishlist)
router.get('/wallet',userAuth,userController.wallet)




///address management
router.post('/addAddress',userController.postAddAddress);
router.get('/editAddress',userAuth,userController.editAddress);
router.get('/deleteAddress',userAuth,userController.deleteAddress)
router.post('/editAddress',userAuth,userController.postEditAddress);


module.exports=router;