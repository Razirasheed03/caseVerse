const { response } = require("../../app");
const User = require("../../models/userSchema")
const Product =require('../../models/productSchema')
const env = require("dotenv").config();
const nodemailer=require('nodemailer')
const bcrypt=require("bcrypt");
const Category = require("../../models/categorySchema");
const Address =require("../../models/addressSchema");

const logout=async(req,res)=>{
    try {

        req.session.destroy((error)=>{
            if(error){
                console.log("Session destoy error",error.message)
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login")
        })
        
    } catch (error) {
        console.log("Logout error",error)
        res.redirect("/pageNotFound")
        
    }
}

const login= async (req,res)=>{
    try {
        const {email,password}=req.body;
        const findUser= await User.findOne({isAdmin:0,email:email});
        if(!findUser){
            return res.render("login",{message:"User not found"})
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is Blocked by admin"})
        }
        const passwordMatch=bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }
        req.session.user={_id:findUser._id,name:findUser.name};
        res.redirect("/")
        
    } catch (error) {
        console.error("login error",error)
        res.render("login",{message:"login failed. Please try again later"})
        
    }
}

const loadLogin=async(req,res)=>{
    try {
        if(!req.session.user){
            const msg=req.session.msg;
            req.session.msg=null;
            return res.render("login",{message:msg})
        }else{
            res.redirect('/')
        }
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
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
            req.session.user={_id:saveUserData._id,username:saveUserData.username};//for showing username after signup
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
        const findUser=await User.findOne({email});
        if(findUser){
            res.render('signup',{ message: "User With this Email Already exists"})
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
        const id = req.params.id;
        const userSession=req.session.user;
        const user =userSession ? await User.findById(userSession._id):null;

        const search = req.query.search || ""; 
        const page = parseInt(req.query.page) || 1;
        const limit = 8; 

     
        const totalProducts = await Product.countDocuments({
            $or: [
                { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } },
        
            ],
        });
  

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } },
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('category')
            .exec();
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shop',{
            product: productData, 
            currentPage: page, 
            totalPages, 
            search, 
            user
        });
    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.status(500).send("Server error");
    }
};


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
  
        const product = await Product.find({isBlocked:false})
        const category=await Category.findOne({_id:product.category})
        const userSession = req.session.user;
        const user = userSession ? await User.findById(userSession._id) : null;
        res.render('home', { user,product,category}); // Pass user as null if not logged in

     
    } catch (error) {
        console.log("home page not found")
        res.status(500).send("server error")

    }
}

const productDetail=async(req,res)=>{
    try {
       
        const id = req.params.id;
        const userSession=req.session.user;
        const user =userSession ? await User.findById(userSession._id):null;
        const product = await Product.findOne({_id:id})
        const category=await Category.findOne({_id:product.category})
        res.render('productDetail',{product,category,user})
        
    } catch (error) {
        res.render("pageerror")
        
    }
}

const profile=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user;
        const user =userSession ? await User.findById(userSession._id):null;
      
        res.render('profile',{user})
        
    } catch (error) {
        res.render("pageerror")
        
    }
}

const address=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user;
        console.log("user id: ",userSession);
        
        const user =userSession ? await User.findById(userSession._id):null;
        console.log('session user ;',userSession)
        const addressData=await Address.findOne({userId:userSession._id});
        res.render('address',{user,userAddress:addressData})
        
    } catch (error) {
        console.log("in address",error)
        res.render("pageerror")
        
    }


}

const postAddAddress=async(req,res)=>{
    try {
        const userId=req.session.user;

        const {addressType,name,address,city,landMark,state,pincode,phone,altPhone}=req.body;

        const userAddress=await Address.findOne({userId:userId});
        if(!userAddress){
            const newAddress=new Address({
                userId,
                address:[{addressType,name,address,city,landMark,state,pincode,phone,altPhone}]
            
            });
            await newAddress.save();
            console.log("successfully added address")
            
        }else{
            userAddress.address.push({addressType,name,address,city,landMark,state,pincode,phone,altPhone})
            await userAddress.save();
        }
        res.status(200).json({success:true})
        // res.redirect('/profile')

        
    } catch (error) {
        console.log("Error adding address",error);
        res.redirect("/pageNotFound");
        
    }
}




const cart=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user;
        const user =userSession ? await User.findById(userSession._id):null;
        res.render('cart',{user})
        
    } catch (error) {
        res.render('pageerror')
        
    }
}

const wishlist=async(req,res)=>{
    try {
        const id=req.params.id;
        const userSession=req.session.user;
        const user=userSession?await User.findById(userSession._id):null;
        res.render('wishlist',{user})
        
    } catch (error) {
        res.render('pageerror')
        
    }
}

const wallet=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user;
        const user =userSession ? await User.findById(userSession._id):null;
        res.render('wallet',{user})
        
    } catch (error) {
        res.render('pageerror')
        
    }
}

const editAddress=async(req,res)=>{
    try {
        
        
        
        const addressId=req.query.id;
        const user=req.session.user;
        console.log(addressId,':   addressId')
        console.log("user session id;",user)
        const username=await User.findOne({_id:user._id});


        const currAddress=await Address.findOne({userId: user._id});

        if(!currAddress){
            return res.redirect("/pageNotFound")
        }
        const addressData=currAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString();
        });
        console.log(addressData);
        
        if(!addressData){
            return res.redirect('/pageNotFound')
        }else{
            res.render('edit-address', { userAddress: addressData, user:username,addressId});

        }
    } catch (error) {
        console.error("error in edit address",error)
        res.redirect('/pageNotFound')      
    }
};

const postEditAddress = async (req, res) => {
    try {
        console.log("in controller");
        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;

        // Find the address document
        const findAddress = await Address.findOne({ "address._id": addressId });
        if (!findAddress) {

            return res.status(404).json({ message: 'Address not found' });
        }

        // Update the address in the database
        await Address.updateOne(
            { "address._id": addressId },
            {
                $set: {
                    "address.$": {
                        _id: addressId,
                        addressType: data.addressType,
                        name: data.name,
                        city: data.city,
                        landMark: data.landMark,
                        state: data.state,
                        pincode: data.pincode,
                        phone: data.phone,
                        address: data.address,
                    }
                }
            }
        );

        console.log('Address updated successfully.');
        res.status(200).json({ message: 'Address updated successfully' });
    } catch (error) {
        console.error("Error in postEditAddress controller:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const deleteAddress=async(req,res)=>{
    try {
        const addressId=req.query.id;
        const findAddress=await Address.findOne({'address._id':addressId});
        if(!findAddress){
            return res.status(404).send("Address not found")
        }

        await Address.updateOne({
            "address._id":addressId
        },{
            $pull:{
                address:{
                    _id:addressId,
                }
            }
        })
        res.redirect("/address")

        
    } catch (error) {
        console.error("Error in delete Address",error)
        res.redirect("/pageNotFound")
        
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
    loadLogin,
    login,
    logout,
    productDetail,
    profile,
    address,
    cart,
    wishlist,
    wallet,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
}
