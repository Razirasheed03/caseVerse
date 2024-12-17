const { response } = require("../../app");
const User = require("../../models/userSchema")
const Product =require('../../models/productSchema')
const env = require("dotenv").config();
const nodemailer=require('nodemailer')
const bcrypt=require("bcrypt");
const Category = require("../../models/categorySchema");
const Address =require("../../models/addressSchema");
const Cart =require("../../models/cartSchema");
const Wishlist =require("../../models/wishlistSchema");
const Coupon =require("../../models/couponSchema");
const Order =require("../../models/orderSchema");
const session =require("express-session");
const { default: mongoose } = require("mongoose");
const Razorpay = require('razorpay');
const crypto = require('crypto');



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
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        
        const search = req.query.search || ""; 
        const page = parseInt(req.query.page) || 1;
        const limit = 8; 
        const sortQuery = req.query.sort || ""; 
        const categoryQuery = req.query.category || ""; // Add category query parameter

        // Build the base query
        const baseQuery = {
            productName: { $regex: new RegExp('.*' + search + '.*', 'i') },
            isBlocked: false
        };

        // Add category filter if a category is selected
        if (categoryQuery) {
            const category = await Category.findOne({ name: categoryQuery });
            if (category) {
                baseQuery.category = category._id;
            }
        }

        // Determine sort criteria
        let sortCriteria = { createdAt: -1 }; // Default sort by newest
        switch(sortQuery) {
            case 'priceAsc':
                sortCriteria = { salePrice: 1 };
                break;
            case 'priceDesc':
                sortCriteria = { salePrice: -1 };
                break;
            case 'nameAsc':
                sortCriteria = { productName: 1 };
                break;
            case 'nameDesc':
                sortCriteria = { productName: -1 };
                break;
            default:
                sortCriteria = { createdAt: -1 };
        }

        // Count total products
        const totalProducts = await Product.countDocuments(baseQuery);

        // Find products with sorting, pagination, and category filtering
        const productData = await Product.find(baseQuery)
            .sort(sortCriteria)
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('category')
            .exec();

        // Fetch all categories for the category filter links
        const categories = await Category.find({ isListed: true, isDeleted: false });

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shop', {
            product: productData, 
            currentPage: page, 
            totalPages, 
            search, 
            user,
            currentSort: sortQuery,
            categories: categories, // Pass categories to the template
            currentCategory: categoryQuery // Pass current category to the template
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


const wallet = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;

        if (!userSession) {
            return res.redirect('/login'); // Redirect if user is not logged in
        }

        const user = await User.findById(userSession._id);
        if (!user) {
            return res.status(404).render('pageerror', { message: 'User not found.' });
        }

        // Fetch wallet balance and transactions
        res.render('wallet', {
            user,
            walletBalance: user.walletBalance || 0, // Default to 0 if not set
            transactions: user.walletTransactions || [], // Default to an empty array
        });
    } catch (error) {
        console.error('Error loading wallet page:', error);
        res.status(500).render('pageerror', { message: 'An error occurred while loading the wallet page.' });
    }
};


const orders = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        if (!userSession) return res.redirect('/login');

        const user = await User.findById(userSession._id);
        if (!user) return res.redirect('/login');

        // Populate product details in order items
        const orders = await Order.find({ userId: userSession._id })
            .sort({ createdAt: -1 })
            .populate({
                path: 'items.productId',
                select: 'productName productImage',
            })
            .lean();

        res.render('orders', {
            user: userSession,
            orders,
            user,
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
        const username=await User.findOne({_id:user._id});
        
        
        const currAddress=await Address.findOne({userId: user._id});
        
        if(!currAddress){
            return res.redirect("/pageNotFound")
        }
        const addressData=currAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString();
        });
        
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
        
        const findAddress = await Address.findOne({ "address._id": addressId });
        if (!findAddress) {
            
            return res.status(404).json({ message: 'Address not found' });
        }
 
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
        const userSession=req.session.user||req.session.googleUser;
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
        const userSession = req.session.user||req.session.googleUser;
        const { productId, quantity } = req.body;
        const user = userSession ? await User.findById(userSession._id) : null;
        if (!user) return res.redirect('/login');

   
        const product = await Product.findById(productId);
        if (!product) return res.status(404).send('Product not found');

      
        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            cart = new Cart({ userId: user._id, items: [] });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId);
        if (existingItem) {
       
            existingItem.quantity += Number(quantity);
            existingItem.totalPrice = existingItem.quantity * existingItem.price;
        } else {

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

const wishlist = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;

        if (!userSession) return res.redirect('/login');

        const user = await User.findById(userSession._id);
        if (!user) return res.redirect('/login');

        // Fetch Wishlist and populate product details
        const wishlist = await Wishlist.findOne({ userId: user._id })
            .populate('products.productId') // Populate product details
            .exec();

        if (!wishlist || wishlist.products.length === 0) {
            return res.render('wishlist', { user, wishlist: [] });
        }

        const wishlistItems = wishlist.products.map((item) => ({
            itemId: item._id, // Unique ID of the wishlist item
            productId: item.productId._id, // ID of the product
            name: item.productId.productName, // Product name
            price: item.productId.salePrice || item.productId.regularPrice, // Product price
            imageUrl: item.productId.productImage[0], // First product image
        }));

        res.render('wishlist', { user, wishlist: wishlistItems });
    } catch (error) {
        console.error('Error fetching wishlist:', error.message);
        res.render('pageerror');
    }
};


const addToWishlist = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const { productId } = req.body;

        if (!userSession) return res.redirect('/login');

        const user = await User.findById(userSession._id);
        if (!user) return res.redirect('/login');

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send('Product not found');

        // Find or create a wishlist for the user
        let wishlist = await Wishlist.findOne({ userId: user._id });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId: user._id,
                products: [],
            });
        }

        // Check if product is already in the wishlist
        const existingItem = wishlist.products.find((item) =>
            item.productId.toString() === productId
        );

        if (existingItem) {
            return res.redirect('/wishlist');
        }

        // Add product to the wishlist
        wishlist.products.push({
            productId: product._id,
            addedOn: new Date(),
        });

        await wishlist.save();

        res.redirect('/wishlist');
    } catch (err) {
        console.error('Error adding product to wishlist:', err.message);
        res.status(500).send('Error adding product to wishlist');
    }
};

const addToCartFromWishlist = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const { productId } = req.body; // Only productId is passed from wishlist
        const quantity = 1; // Default quantity for items added from wishlist

        if (!userSession) return res.redirect('/login');

        const user = await User.findById(userSession._id);
        if (!user) return res.redirect('/login');

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send('Product not found');

        // Find or create the cart
        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            cart = new Cart({ userId: user._id, items: [] });
        }

        // Check if the product already exists in the cart
        const existingItem = cart.items.find(item => item.productId.toString() === productId);
        if (existingItem) {
            existingItem.quantity += quantity; // Increment quantity
            existingItem.totalPrice = existingItem.quantity * existingItem.price; // Recalculate total price
        } else {
            cart.items.push({
                productId: product._id,
                quantity,
                price: product.salePrice || product.regularPrice, // Default to salePrice or regularPrice
                totalPrice: (product.salePrice || product.regularPrice) * quantity,
            });
        }

        // Save the cart
        await cart.save();

        // Remove the item from the wishlist
        await Wishlist.updateOne(
            { userId: user._id },
            { $pull: { products: { productId: product._id } } }
        );

        // Redirect to the cart page
        res.redirect('/cart');
    } catch (error) {
        console.error('Error adding product to cart from wishlist:', error);
        res.status(500).send('Internal server error');
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const { productId } = req.body; // Assuming `productId` is sent from the form

        if (!userSession) {
            return res.redirect('/login');
        }

        // Validate the productId
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send('Invalid product ID');
        }

        // Fetch user
        const userId = userSession._id;

        // Remove the product from the wishlist
        const result = await Wishlist.updateOne(
            { userId },
            { $pull: { products: { productId } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send('Product not found in wishlist');
        }

        res.redirect('/wishlist'); // Redirect to wishlist page after removing
    } catch (error) {
        console.error('Error removing product from wishlist:', error.message);
        res.status(500).send('Internal server error');
    }
};




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

const quantityChange=async(req,res)=>{
    try {
        const {quantity,id}=req.body;
        console.log("id:",id)

        const updateOrder = await Cart.updateOne(
            { "items._id": id },
            {
                $set: {
                    "items.$.quantity": quantity,
                    "items.$.totalPrice": quantity * (await Cart.findOne({ "items._id": id }, { "items.$": 1 })).items[0].price,
                },
            }
        );
        
        





    } catch (error) {
        console.error("error in quantity",error)
        
    }
}

const cart = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;

        if (!user) return res.redirect('/login');

        // Fetch user's cart
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId').exec();

        if (!cart || cart.items.length === 0) {
            return res.render('cart', {
                user,
                cart: { items: [] },
                couponDiscount: 0,
                appliedCoupon: null,
                subtotal: 0,
                totalPrice: 0
            });
        }

        // Calculate subtotal
        const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        // Calculate shipping
        const shipping = subtotal > 499 ? 0 : 40;

        // Initialize coupon variables
        let couponDiscount = 0;
        let appliedCoupon = null;

        // Check for applied coupon
        if (req.query.coupon) {
            const couponName = req.query.coupon.trim();
            const coupon = await Coupon.findOne({ name: couponName, isList: true });

            if (coupon) {
                const currentDate = new Date();
                if (currentDate <= coupon.expireOn && subtotal >= coupon.minimumPrice) {
                    couponDiscount = coupon.offerPrice;
                    appliedCoupon = couponName;
                }
            }
        }

        // Calculate total price
        const totalPrice = subtotal- couponDiscount;
        console.log(subtotal,"+",couponDiscount,"+",totalPrice)

        // Render the cart page
        res.render('cart', {
            user,
            cart,
            couponDiscount,
            appliedCoupon,
            subtotal,
            totalPrice
        });
        
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).render('pageerror', { error: 'An error occurred while fetching the cart.' });
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;

        if (!user) return res.status(401).json({ error: 'User not authenticated.' });

        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId').exec();

        if (!cart) return res.status(400).json({ error: 'Cart is empty.' });

        // Calculate subtotal
        const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        const coupon = await Coupon.findOne({ name: couponCode.trim(), isList: true });
        if (!coupon) return res.status(404).json({ error: 'Invalid coupon code.' });

        const currentDate = new Date();

        if (currentDate > coupon.expireOn) {
            return res.status(400).json({ error: 'Coupon is expired.' });
        }

        if (subtotal < coupon.minimumPrice) {
            return res.status(400).json({ error: `Minimum cart total of ₹${coupon.minimumPrice} is required.` });
        }
        if (coupon.userId.includes(user._id)) {
            return res.status(400).json({ error: 'Coupon already used by this user.' });
        }
        // Apply discount and save to cart
        const couponDiscount = coupon.offerPrice;
        const totalPrice = subtotal - couponDiscount;
        console.log(totalPrice,subtotal,couponDiscount)
        req.session.couponDiscount = couponDiscount

        await Cart.updateOne(
            { userId: user._id },
            { $set: { couponDiscount,totalPrice } } // Save discount and total to the cart
        );

        coupon.userId.push(user._id);
        await coupon.save();

        res.status(200).json({
            success: 'Coupon applied successfully!',
            discount: couponDiscount
        });
    } catch (error) {
        console.error('Coupon Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
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

        const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        // Calculate shipping
        const shipping = subtotal > 499 ? 0 : 40;

        // Initialize coupon variables
        let couponDiscount = 0;
        let appliedCoupon = null;

        // Check for applied coupon
        if (req.query.coupon) {
            const couponName = req.query.coupon.trim();
            const coupon = await Coupon.findOne({ name: couponName, isList: true });

            if (coupon) {
                const currentDate = new Date();
                if (currentDate <= coupon.expireOn && subtotal >= coupon.minimumPrice) {
                    couponDiscount = coupon.offerPrice;
                    appliedCoupon = couponName;
                }
            }
        }

        // Calculate total price
        const totalPrice = subtotal- couponDiscount;
      
        res.render('checkout', {
            user,
            cart,
            totalPrice,
            addresses: addressData ? addressData.address : [], 
        });
    } catch (error) {
        console.error('Error rendering checkout:', error);
        res.status(500).render('pageerror');
    }
};



const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});


const placeOrder = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;

        if (!userSession) {
            return res.status(401).json({ success: false, message: 'User is not authenticated' });
        }

        const user = await User.findById(userSession._id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const { addressId, paymentMethod } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: 'Address or payment method is missing' });
        }

        const userId = new mongoose.Types.ObjectId(userSession._id);
        const objectAddressId = new mongoose.Types.ObjectId(addressId);

        const address = await Address.aggregate([
            { $match: { userId } },
            { $unwind: '$address' },
            { $match: { 'address._id': objectAddressId } }
        ]);

        if (!address.length) {
            return res.status(400).json({ success: false, message: 'Address not found' });
        }

        const selectedAddress = address[0].address;

        const cartItems = await Cart.findOne({ userId: user._id }).populate({
            path: 'items.productId',
            select: 'productName salePrice quantity status',
        });

        if (!cartItems || !cartItems.items.length) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }
        const subtotal = cartItems.items.reduce((total, item) => total + item.totalPrice, 0);
        const shippingCharge = subtotal > 499 ? 0 : 40;
        const totalAmount = subtotal;
        console.log(typeof totalAmount)
        const finalAmount = totalAmount + shippingCharge - (req.session.couponDiscount || 0);
        
        // Correct the bulk update operation
        const bulkOps = cartItems.items.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { quantity: -item.quantity } }
            }
        }));
        await Product.bulkWrite(bulkOps);

        if (paymentMethod === 'razorpay') {
            try {
                const razorpayOrder = await razorpayInstance.orders.create({
                    currency: 'INR',
                    receipt: `${user._id}_${Date.now()}`,
                    amount: (totalAmount-req.session.couponDiscount )* 100,
                });

                const newOrder = new Order({
                    userId: user._id,
                    razorpayDetails: {
                        orderId: razorpayOrder.id,
                    },
                    items: cartItems.items.map(item => ({
                        productId: item.productId._id,
                        quantity: item.quantity,
                        totalPrice: item.totalPrice,
                    })),
                    totalAmount:totalAmount-req.session.couponDiscount,
                    totalCouponDiscount: req.session.couponDiscount || 0,
                    finalAmount,
                    address: selectedAddress,
                    paymentMethod,
                    status: 'In Transit',
                });

                await newOrder.save();

                return res.status(200).json({
                    success: true,
                    message: 'Razorpay order created successfully',
                    razorpayOrderId: razorpayOrder.id,
                    razorpayKey: process.env.RAZORPAY_KEY,
                    totalAmount: finalAmount,
                });
            } catch (error) {
                console.error('Razorpay order creation failed:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create Razorpay order',
                });
            }
        } else if (paymentMethod === 'COD') {
            const newOrder = new Order({
                userId: user._id,
                items: cartItems.items.map(item => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
                })),
                totalAmount:totalAmount-req.session.couponDiscount,
                totalCouponDiscount: req.session.couponDiscount || 0,
                finalAmount,
                address: selectedAddress,
                paymentMethod,
                status: 'In Transit',
            });
            console.log("in cod")

            await newOrder.save();
            await Cart.findOneAndUpdate({ userId: user._id }, { $set: { items: [] ,totalPrice:0,couponDiscount:0} });

            return res.status(200).json({
                success: true,
                message: 'Order placed successfully with Cash on Delivery',
                orderId: newOrder._id,
            });
        }
        else if (paymentMethod === 'wallet') {
            if (user.walletBalance < totalAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance',
                });
            }

            user.walletBalance -= finalAmount;
            //////////////////////changeHere
            user.walletTransactions.push({
                detail: 'Payment for Order',
                amount: totalAmount,
                type: 'debit',
            });
            console.log("in wallet")
            await user.save();


            const newOrder = new Order({
                userId: user._id,
                items: cartItems.items.map(item => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
                })),
                totalAmount:totalAmount-req.session.couponDiscount,
                totalCouponDiscount: req.session.couponDiscount || 0,
                finalAmount,
                address: selectedAddress,
                paymentMethod,
                status: 'In Transit',
                paymentStatus:'Paid'
            });
            console.log('here')

            await newOrder.save();
            await Cart.findOneAndUpdate({ userId: user._id }, { $set: { items: [] ,totalPrice:0,couponDiscount:0} });

            return res.status(200).json({
                success: true,
                message: 'Order placed successfully using wallet payment',
                orderId: newOrder._id,
            });
        }  else {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Signature mismatch!' });
        }

        const order = await Order.findOne({ 'razorpayDetails.orderId': razorpay_order_id });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found!' });
        }

        order.paymentStatus = 'Paid';
        order.razorpayDetails.paymentId = razorpay_payment_id;
        order.razorpayDetails.signature = razorpay_signature;
        await order.save();

        await Cart.findOneAndUpdate(
            { userId: order.userId },
            { $set: { items: [] } }
        );

        return res.status(200).json({ success: true, message: 'Payment verified successfully!' });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const refundToWallet = async (req, res) => {
    try {
        const { orderId } = req.body; // Assume order ID is passed from the frontend
        const userSession = req.session.user || req.session.googleUser;
        
        const order = await Order.findOne({ _id: orderId, userId: userSession._id });
        if (!order) return res.status(404).json({ message: 'Order not found.' });
        console.log('hii1')
        if (order.paymentStatus !== 'Paid') {
            return res.status(400).json({ message: 'Only paid orders can be refunded to the wallet.' });
        }
        console.log('hii2')
        
        console.log(0)
        const user = await User.findById(userSession._id);
        const refundAmount = order.finalAmount-req.session.couponDiscount||0;
        console.log(refundAmount)

        user.walletBalance += refundAmount;

        user.walletTransactions.push({
            detail: `Refund for Order ID: ${order._id}`,
            amount: finalAmount-req.session.couponDiscount,
            type: 'credit',
        });
        console.log(finalAmount-req.session.couponDiscount)
        console.log(2)

        order.paymentStatus = 'Refunded';
        order.status = 'Returned';
        console.log(3)

        await user.save();
        await order.save();

        res.json({
            message: 'Refund successfully added to the wallet.',
            walletBalance: user.walletBalance,
        });
    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({ message: 'Error processing refund.' });
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


    const cancelOrder = async (req, res) => {
        try {
            const orderId = req.params.id;
    
            const order = await Order.findById(orderId).populate({
                path: 'items.productId',
                select: 'productName quantity',
            });
    
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
    
            // Update stock for each product
            for (const item of order.items) {
                const product = item.productId;
                const purchasedQuantity = item.quantity;
                product.quantity += purchasedQuantity;
    
                if (product.status === 'out of stock') {
                    product.status = 'Available';
                }
                await product.save();
            }
    
            // Update wallet balance if payment status is "Paid"
            if (order.paymentStatus === 'Paid') {
                const user = await User.findById(order.userId);
                user.walletBalance += order.totalAmount;
                order.paymentStatus = 'Refunded';
                user.walletTransactions.push({
                    detail: `Refund for Order ID: ${order._id}`,
                    amount: order.totalAmount,
                    type: 'credit',
                });
                await user.save();
                await order.save();
            }
           
    
            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                { status: 'Cancelled' },
                { paymenStatus: 'Refunded' },
                { new: true }
            );
    
            res.status(200).json({ success: true, message: 'Order cancelled and stock updated' });
        } catch (error) {
            console.error("Server Error while canceling order:", error.message);
            console.error(error.stack);
            res.status(500).json({ success: false, message: 'Internal server error', error });
        }
    };
    
    
    const returnOrder = async (req, res) => {
        try {
            const orderId = req.params.id;
    
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
    
            // Update wallet balance if payment status is "Paid"
            // if (order.paymentStatus === 'Paid') {
            //     const user = await User.findById(order.userId);
            //     user.walletBalance += order.finalAmount;
            //     order.paymentStatus = 'Refunded';
            //     await user.save();
            // }
    
            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                { status: 'Return Request Sent' },
                { new: true }
            );
    
            res.json({ success: true });
        } catch (error) {
            console.error('Error returning order:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };
    


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
    applyCoupon,
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
    quantityChange,
    updateCart,
    checkout,
    placeOrder,
    orderComplete,
    cancelOrder,
    returnOrder,
    addToWishlist,
    addToCartFromWishlist,
    removeFromWishlist,
    verifyPayment,
    refundToWallet,
}
