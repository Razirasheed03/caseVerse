const User=require("../models/userSchema");

const userAuth=(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data &&!data.isBlocked){
                next();
            }else{
                req.session.user=null;
                next();
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware");
            res.status(500).send("Internal Server error")
        })
    }else{
      next();
    }
}

const profileAuth=(req,res,next)=>{
    if(req.session.user){
        next();
    }else{
        req.session.msg="Please Login First";
        res.redirect('/login')
    }
}

const adminAuth=(req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/login")
        }
    })
    .catch(error=>{
        console.log("Error in adminauth middleware",error);
        res.status(500).send("Internal Server Error")
    })
}

module.exports={
    userAuth,
    adminAuth,
    profileAuth,
}