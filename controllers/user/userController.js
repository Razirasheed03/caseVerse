const { response } = require("../../app");
const User = require("../../models/userSchema")
const env = require("dotenv").config();
const nodemailer=require('nodemailer')
const bcrypt=require("bcrypt");
// const signup=async(req,res)=>{
//     try {

//         const {email,password,confirmPassword}=req.body;
//         if(password!==confirmPassword){
//             return res.render()
//         }

//     } catch (error) {

//     }
// }////new creation of signup at 7-10 at 8th episode not done
const resendOtp=async(req,res)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }
        const otp=generateOtp();
        req.session.userOtp=otp;
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP",otp);
            res.status(200).json({success:true,message:"OTP Resend succesfully"})
            
        }else{
            res.status(500).json({success:false,message:"failed to resend OTP. Please try again"})

        }
    } catch (error) {
        console.error("Error resending OTP",error)
        res.status(500).json({success:false,message:"Internl server Error . Please try again"})
        
    }
}

const securePassword=async (password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash; 
    } catch (error) {
        
    }
}
const verifyotp=async (req,res)=> {
    try {
        const {otp}=req.body;
        console.log(otp);
        if(otp===req.session.userOtp){
            const user=req.session.userData
            const passwordHash=await securePassword(user.password)
            const saveUserData=new User({
                username:user.username,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
            })////////change ividem vareeeee
            await saveUserData.save();
            req.session.user=saveUserData._id;
            res.json({success:true,redirectUrl:"/"})
            
        }else{
            res.status(400).json({success:false,message:"Invalid OTP,Please try again"})
        }

    } catch (error) {
        console.error('error in otp verify',error)
        res.status(500).json({success:false,message:"An error occured"})
    }
}
const loadverifyotp = async (req, res) => {
    try {
        res.render('verify-otp')
    } catch (error) {
        console.log(error, "verify page")
        res.status(500).send("server error")

    }
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })
        /////mail  format
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "From Caseverse ",
            text: `Verify Using this ${otp}`,
            html: `<b>Your VerifyCode: ${otp}</b>`,
        })
        
        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }

}

const signup = async (req, res) => {
  ///destructuring from body
    try {
        const { username, email, phone, password} = req.body;
        // const newUser = new User({ username, email, phone, password });
        // console.log("saved")
        // await newUser.save()///save to mongodb
        // res.json({ success: true, message: "user signup successfuly!!" })

        const findUser=await User.findOne({email});
        if(findUser){
            console.log("user found")
            return res.json({status:false, message: "User already exists"})
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        console.log("email sent:",emailSent)
        if(!emailSent){
            return res.json({status: false, message: 'email already exist'})
        }
        req.session.userOtp=otp;
        req.session.userData={username,phone,email,password};

        res.json({status: true, message: "user verified successfuly!!"})
        console.log("OTP :",otp)

    } catch (error) {
        if (error.code == 11000) return res.status(500).json({ success: true, message: "name already exist" })
        res.status(500).json({ success: false, message: error.message })
        console.error("signup error",error)
        
    }
}



const loadSignup = async (req, res) => {
    try {
        return res.render('signup')

    } catch (error) {
        console.log("home page not loading", error)
        res.status(500).send("server error")
    }
}

const loadshopping = async (req, res) => {
    try {
        res.render('shop')
    } catch (error) {
        console.log(error, "shopping page not loading")
        res.status(500).send("server error")

    }
}

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        console.log(error, "erooooooor")
        res.redirect("/pageNotFound")

    }
}

const loadHomepage = async (req, res) => {
    try {
        return res.render("home")

    } catch (error) {
        console.log("home page not found")
        res.status(500).send("server error")

    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadshopping,
    signup,
    verifyotp,
    loadverifyotp,
    resendOtp,
}