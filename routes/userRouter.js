const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userController");
const passport = require("passport");
const { profileAuth,userAuth } = require("../middlewares/auth");
const multer=require('multer');
const upload=multer();


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
router.post("/login",userController.login )
router.get("/logout",userController.logout)

///user products
router.get('/productDetail/:id',userAuth,userController.productDetail)


///user profile
router.get('/profile',profileAuth,userAuth,userController.profile)
router.get('/address',profileAuth,userAuth,userController.address)
router.get('/cart',profileAuth,userAuth,userController.cart)
router.get('/wishlist',profileAuth,userAuth,userController.wishlist)
router.get('/wallet',profileAuth,userAuth,userController.wallet)
router.get('/orders',profileAuth,userAuth,userController.orders)




///address management
router.post('/addAddress',userController.postAddAddress);
router.get('/editAddress',userAuth,userController.editAddress);
router.get('/deleteAddress',userAuth,userController.deleteAddress)
router.post('/editAddress',userController.postEditAddress);

////forgot password
router.get("/forgotPassword",userController.getForgetPassPage);
router.post("/forgotEmailValid",userController.forgotEmailValid)
// router.get('/forgetPassOtp',userController.forgotEmailValid)
router.post("/verifyPassForgotOtp",userController.verifyForgotPassOtp);
router.post("/resendForgotOtp",userController.resendOtp)
router.get('/resetPassword',userController.getResetPassPage)
router.post('/resetPassword',userController.postNewPassword);

router.get("/changePassword",userController.loadChangePassword)
router.post('/changePassword',userController.changePassword);
router.post('/saveUserData',upload.none(),userController.saveUserData)


///cart management
router.post('/add-to-cart', userController.addToCart);
router.post('/update-cart', userController.updateCart);
router.get('/checkout', userAuth,userController.checkout);
// router.post('/place-order', userController.placeOrder);
router.post('/quantityChange',userController.quantityChange)
router.post('/applyCoupon', userController.applyCoupon);
router.get('/couponModal',userController.couponModal)

//order management
router.get('/orderComplete',userAuth,userController.orderComplete)
router.post('/placeOrder',userController.placeOrder);
router.post('/cancelOrder/:id', userController.cancelOrder);
router.post('/returnOrder/:id', userController.returnOrder);

router.get('/download-invoice/:orderId', userController.downloadInvoice);

//wishlist management
router.post('/add-to-wishlist',profileAuth,userController.addToWishlist)
router.post('/add-to-cart-from-wishlist',userController.addToCartFromWishlist)
router.post('/remove-from-wishlist',userController.removeFromWishlist);


router.post('/verifyPayment', userController.verifyPayment);
router.post('/refundToWallet', userController.refundToWallet);


module.exports=router;