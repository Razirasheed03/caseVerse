const express=require("express")
const router=express.Router();
const userController=require("../controllers/user/userController")



//////////-----route to home
router.get("/pageNotFound",userController.pageNotFound)///(for error handling)
router.get("/",userController.loadHomepage);



module.exports=router;