const { response } = require("../../app");
const User = require("../../models/userSchema")
const Product =require('../../models/productSchema')
const env = require("dotenv").config();
const nodemailer=require('nodemailer')
const bcrypt=require("bcrypt");
const Category = require("../../models/categorySchema");
const Address =require("../../models/addressSchema");
const Cart =require("../../models/cartSchema");
const Order =require("../../models/orderSchema");
const session =require("express-session");
const { default: mongoose } = require("mongoose");

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
           return res.json({success:false,message:"User not found"})
        }
        if(findUser.isBlocked){
            return res.json({success:false,message:"User is Blocked by admin"})
            
        }

        const passwordMatch=await bcrypt.compare(password,findUser.password);
        
        if(!passwordMatch){
      
            return res.json({success:false,message:"Incorrect Password"})
        }
        req.session.user={_id:findUser._id,name:findUser.username};
       
        
        res.status(200).json({success:true,message:`${findUser.username} is logIn Successfully`})
        
    } catch (error) {
        console.error("login error",error)
        res.status(500).json({success:false,message:"login failed. Please try again later"})
        
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
        res.status(500).json({success:false,message:"Internal server Error . Please try again"})
        
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
            console.log("1")
    return res.json({success:false,message:"User With this Email Already exists"})
        
        }


        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        console.log("email sent:",emailSent)
        if(!emailSent){
            return res.render({status: false, message: 'email already exist'})
        }
        req.session.userOtp=otp;
        req.session.userData={username,phone,email,password};

        res.json({status: true, message: "user verified successfuly!!"})
        console.log("OTP :",otp)

    } catch (error) {
        console.log("error in otp")
        res.render('pageerror')
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
        const userSession=req.session.user|| req.session.googleUser;
        const user =userSession ? await User.findById(userSession._id):null;
        

        const search = req.query.search || ""; 
        const page = parseInt(req.query.page) || 1;
        const limit = 8; 

     
        const totalProducts = await Product.countDocuments({
            $or: [
                { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } },
        
            ],
        });
  

        const productData = await Product.find(
    
                { productName: { $regex: new RegExp('.*' + search + '.*', 'i') },isBlocked:false }
        )
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
        // const googleUser=req.session.user;
        req.session.googleUser = req.user
        const product = await Product.find({isBlocked:false})
        const category=await Category.findOne({_id:product.category})
        const userSession = req.session.user || req.session.googleUser;
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
        const userSession=req.session.user|| req.session.googleUser;
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
        const userSession=req.session.user|| req.session.googleUser;
        const user =userSession ? await User.findById(userSession._id):null;
      
        res.render('profile',{user})
        
    } catch (error) {
        res.render("pageerror")
        
    }
}

const address=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user|| req.session.googleUser; 
        const user =userSession ? await User.findById(userSession._id):null;
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

const wishlist=async(req,res)=>{
    try {
        const id=req.params.id;
        const userSession=req.session.user|| req.session.googleUser;
        const user=userSession?await User.findById(userSession._id):null;
        res.render('wishlist',{user})
        
    } catch (error) {
        res.render('pageerror')
        
    }
}

const wallet=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user|| req.session.googleUser;
        const user =userSession ? await User.findById(userSession._id):null;
        res.render('wallet',{user})
        
    } catch (error) {
        res.render('pageerror')
        
    }
}

const orders = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        if (!userSession) return res.redirect('/login');

        const user = await User.findById(userSession._id);
        if (!user) return res.redirect('/login');

        // Fetch the orders along with the address
        const orders = await Order.find({ userId: userSession._id }).sort({ createdAt: -1 });

        res.render('orders', {
            user: userSession,
            orders,
            user, // Pass the user information as well
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('pageerror');
    }
};



const editAddress=async(req,res)=>{
    try {
        
        
        
        const addressId=req.query.id;
        const user=req.session.user|| req.session.googleUser;
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
        return res.status(200).json({message:true})
        // res.redirect("/address")
        
        
    } catch (error) {
        console.error("Error in delete Address",error)
        res.redirect("/pageNotFound")
        
    }
}

const getForgetPassPage=async (req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user|| req.session.googleUser;
        const user =userSession ? await User.findById(userSession._id):null;
        
        res.render("forgotPassword",{user});
        
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}

const forgotEmailValid=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user|| req.session.googleUser; 
        const user =userSession ? await User.findById(userSession._id):null;
        
        const {email}=req.body;
        const findUser=await User.findOne({email:email});
        if(findUser){
            const otp=generateOtp();
            const emailSent=await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp=otp;
                req.session.email=email;
                res.render("forgotPassOtp",{user})
                console.log("otp is :",otp)
            }
            else{
                res.json({success:false,message:"failed to send otp Please try again"});
            }
        }else{
            res.render("forgotPassword",{user,
                message:"User With this email does not exist"
            })
        }
        
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}

const verifyForgotPassOtp=async(req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp=== req.session.userOtp){
            res.json({success:true,redirectUrl:'/resetPassword'})
        }else{
            res.json({success:false,message:"Otp not matching"});
        }
        
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured Please try again"})
        
    }
}

const getResetPassPage=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user|| req.session.googleUser;
        const user =userSession ? await User.findById(userSession._id):null;
        
        res.render("resetPassword",{user})
        
    } catch (error) {
        res.render("/pageNotFound")
        
    }
}

const postNewPassword=async(req,res)=>{
    try {
        const {newPass1,newPass2}=req.body;
        const email=req.session.email;
        if(newPass1===newPass2){
            const passwordHash =await securePassword(newPass1)
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login")
        }else{
            res.render("resetPassword",{message:'Password do not match'});
        }
        
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}

const loadChangePassword=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user|| req.session.googleUser;
        const user =userSession ? await User.findById(userSession._id):null;
        
        res.render('changePassword',{user})
        
    } catch (error) {
        res.render('pageNotFound')
        
    }
}

const changePassword = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession=req.session.user;
        const user =userSession ? await User.findById(userSession._id):null;
        
        
        const { currentPassword, newPassword } = req.body;
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (passwordMatch) {
            if (currentPassword == newPassword) {
                return res.render('changePassword', { message: "New password cannot be the same as the current password.", user, title: "Update Password" });
            }
            const passwordHash = await securePassword(newPassword);
            await User.updateOne({ _id: user._id }, { $set: { password: passwordHash } });
            console.log('password updated Successfully');
            return res.redirect('/profile');
        } else {
            return res.render('changePassword', { message: "Wrong Password", user, title: "Update Password" });
        }
        
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotfound');
    }
}

const saveUserData=async(req,res)=>{
    try {
        const id = req.params.id;
        const userSession=req.session.user;
        const user =userSession ? await User.findById(userSession._id):null;
        const data=req.body
        if(!user){
            return res.status(400).json('Error User not Found');
        }
        await User.updateOne({_id:user._id},{
            username:data.username,
        })
        res.status(200).json("success")
        
    } catch (error) {
        
    }
}

const addToCart = async (req, res) => {
    try {
        const userSession = req.session.user;
        const { productId, quantity } = req.body;
        const user = userSession ? await User.findById(userSession._id) : null;
        if (!user) return res.redirect('/login');

        // Fetch the product to get the price
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send('Product not found');

        // Find the user's cart or create a new one
        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            cart = new Cart({ userId: user._id, items: [] });
        }

        // Check if the product is already in the cart
        const existingItem = cart.items.find(item => item.productId.toString() === productId);
        if (existingItem) {
            // Update the quantity and total price if the product already exists in the cart
            existingItem.quantity += Number(quantity);
            existingItem.totalPrice = existingItem.quantity * existingItem.price;
        } else {
            // Add the product to the cart if it's not there
            cart.items.push({
                productId: product._id,
                quantity,
                price: product.salePrice,
                totalPrice: product.salePrice * quantity,
            });
        }

        // Save the cart
        await cart.save();

        // Redirect to the cart page after adding the item
        res.redirect('/cart');
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Internal server error');
    }
};

// Update Cart (for quantity update and item removal)
const updateCart = async (req, res) => {
    try {
        const userSession = req.session.user|| req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        if (!user) return res.redirect('/login');

        // Fetch the user's cart
        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) return res.redirect('/cart'); // If no cart, redirect to cart

        // Handle removing item from cart
        if (req.body.removeItem) {
            const itemId = req.body.removeItem;
            cart.items = cart.items.filter(item => item._id.toString() !== itemId);
            await cart.save();
            return res.redirect('/cart'); // After removal, redirect to the cart
        }

        // Handle quantity update
        if (req.body.quantity) {
            const updatedQuantities = req.body.quantity;
            for (let itemId in updatedQuantities) {
                const quantity = updatedQuantities[itemId];
                const cartItem = cart.items.find(item => item._id.toString() === itemId);

                if (cartItem) {
                    const product = await Product.findById(cartItem.productId);
                    cartItem.quantity = quantity;
                    cartItem.totalPrice = product.salePrice * quantity;
                }
            }
            await cart.save();
        }

        // Redirect to the cart page after the update
        res.redirect('/cart');
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).send('Internal server error');
    }
};

// Render Cart Page
const cart = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        if (!user) return res.redirect('/login');

        // Fetch the user's cart and populate product details
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId').exec();
        
        if (!cart || cart.items.length === 0) {
            return res.render('cart', { user, cart: { items: [] } });
        }

        // Render the cart page
        res.render('cart', { user, cart });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).render('pageerror', { error: 'An error occurred while fetching the cart.' });
    }
};

const checkout = async (req, res) => {
    try {
        const userSession = req.session.user|| req.session.googleUser;
        if (!userSession) return res.redirect('/login');

        const user = await User.findById(userSession._id);
        const addressData = await Address.findOne({ userId: userSession._id });
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.redirect('/cart');
        }

        res.render('checkout', {
            user,
            cart,
            addresses: addressData ? addressData.address : [], // Pass addresses to the template
        });
    } catch (error) {
        console.error('Error rendering checkout:', error);
        res.status(500).render('pageerror');
    }
};

const placeOrder = async (req, res) => {
    try {
        // Check if the user is authenticated
        const userSession = req.session.user || req.session.googleUser;
        if (!userSession) {
            return res.status(401).json({ success: false, message: 'User is not authenticated' });
        }

        const user = await User.findById(userSession._id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const { addressId, paymentMethod } = req.body;

        const userId = new mongoose.Types.ObjectId(userSession._id);
        const objectAddressId = new mongoose.Types.ObjectId(addressId);

        // Fetch the address
        const address = await Address.aggregate([
            { $match: { userId } },
            { $unwind: "$address" },
            { $match: { "address._id": objectAddressId } },
        ]);

        if (!address.length) {
            return res.status(400).json({ success: false, message: 'Address not found' });
        }

        const selectedAddress = address[0].address;

        // Fetch cart items and populate product details including images
        const cartItems = await Cart.findOne({ userId: user._id }).populate({
            path: 'items.productId',
            select: 'name price image', // Ensure 'image' is included in the population
        });

        if (!cartItems || !cartItems.items.length) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        const totalAmount = cartItems.items.reduce((total, item) => total + item.totalPrice, 0);
        const shippingCharge = 50;
        const finalAmount = totalAmount + shippingCharge;

        // Create the order
        const newOrder = new Order({
            userId: user._id,
            address: selectedAddress,
            items: cartItems.items, // Includes the populated product details
            paymentMethod,
            totalAmount,
            finalAmount,
        });

        console.log('Generated Order ID:', newOrder.orderId); // Debugging the generated order ID

        // Save the order
        await newOrder.save();

        // Clear the cart after order placement
        await Cart.findOneAndUpdate({ userId: user._id }, { $set: { items: [] } });

        // Respond with success message
        res.status(200).json({ 
            success: true, 
            message: 'Order placed successfully', 
            orderId: newOrder.orderId 
        });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order' });
    }
};





const orderComplete=async(req,res)=>{
    try {
        const userSession = req.session.user|| req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        res.render('orderComplete',{user});
        
    } catch (error) {
        res.render('pageerror')
        
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
    orders,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    getForgetPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    postNewPassword,
    changePassword,
    loadChangePassword,
    saveUserData,
    addToCart,
    updateCart,
    checkout,
    placeOrder,
    orderComplete
}
