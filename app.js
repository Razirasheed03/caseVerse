const express = require("express");
const app=express();
const path=require("path");
const env=require("dotenv").config();
const session=require("express-session")
const passport=require("./config/passport")
const db =require("./config/db");
const userRouter=require("./routes/userRouter");
const cors=require('cors')
const adminRouter=require("./routes/adminRouter")
db();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({extended:true}))
app.use(session({
secret:process.env.SESSION_SECRET,
resave:false,
saveUninitialized:true,
cookie:{
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000///72 hrs
}

}))

////passport initialize

app.use(passport.initialize())
app.use(passport.session());




/////cache controlling
app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})

app.set('view engine','ejs')
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


app.use("/",userRouter);
app.use("/admin",adminRouter)





process.env.PORT;
app.listen(process.env.PORT,()=>{
    console.log("server running")
})



module.exports=app;