// const { response } = require("../../app");
const env = require("dotenv").config();
const User = require("../../models/userSchema")
const Product = require('../../models/productSchema')
const nodemailer = require('nodemailer')
const bcrypt = require("bcrypt");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Coupon = require("../../models/couponSchema");
const Order = require("../../models/orderSchema");
const session = require("express-session");
const { default: mongoose } = require("mongoose");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');



const logout = async (req, res) => {
    try {

        req.session.destroy((error) => {
            if (error) {
                console.error("Session destoy error", error.message)
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login")
        })

    } catch (error) {
        console.log("Logout error", error)
        res.redirect("/pageNotFound")

    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });

        if (!findUser) {
            return res.json({ success: false, message: "User not found" })
        }
        if (findUser.isBlocked) {
            return res.json({ success: false, message: "User is Blocked by admin" })

        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {

            return res.json({ success: false, message: "Incorrect Password" })
        }
        req.session.user = { _id: findUser._id, name: findUser.username };


        res.status(200).json({ success: true, message: `${findUser.username} is logIn Successfully` })

    } catch (error) {
        console.error("login error", error)
        res.status(500).json({ success: false, message: "login failed. Please try again later" })

    }
}

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            const msg = req.session.msg;
            req.session.msg = null;
            return res.render("login", { message: msg })
        } else {
            res.redirect('/')
        }

    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }
        const otp = generateOtp();
        req.session.userOtp = otp;
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP", otp);
            res.status(200).json({ success: true, message: "OTP Resend succesfully" })

        } else {
            res.status(500).json({ success: false, message: "failed to resend OTP. Please try again" })

        }
    } catch (error) {
        console.error("Error resending OTP", error)
        res.status(500).json({ success: false, message: "Internal server Error . Please try again" })

    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {

    }
}
const verifyotp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp);
        if (otp === req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)
            const saveUserData = new User({
                username: user.username,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            })////////change ividem vareeeee
            await saveUserData.save();
            req.session.user = { _id: saveUserData._id, username: saveUserData.username };//for showing username after signup
            res.json({ success: true, redirectUrl: "/" })

        } else {
            res.status(400).json({ success: false, message: "Invalid OTP,Please try again" })
        }

    } catch (error) {
        console.error('error in otp verify', error)
        res.status(500).json({ success: false, message: "An error occured" })
    }
}
const loadverifyotp = async (req, res) => {
    try {
        res.render('verify-otp')
    } catch (error) {
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
        console.error("Error sending email", error);
        return false;
    }

}

const signup = async (req, res) => {
    ///destructuring from body
    try {
        const { username, email, phone, password } = req.body;
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.json({ success: false, message: "User With this Email Already exists" })

        }


        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.render({ status: false, message: 'email already exist' })
        }
        req.session.userOtp = otp;
        req.session.userData = { username, phone, email, password };

        res.json({ status: true, message: "user verified successfuly!!" })
        console.log("OTP :", otp)

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
        const isLoggedIn = !!(req.session.user || req.session.googleUser);
        const user = isLoggedIn ? await User.findById(req.session.user?._id || req.session.googleUser?._id) : null;
        
        const search = req.query.search || "";
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const sortQuery = req.query.sort || "";
        const categoryQuery = req.query.category || "";

        // Build the base query
        const baseQuery = {
            productName: { $regex: new RegExp('.*' + escapedSearch + '.*', 'i') },
            isBlocked: false,
            quantity: { $gt: 0 }
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
        switch (sortQuery) {
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

        // Fetch user's wishlist if logged in
        const wishlist = isLoggedIn
            ? await Wishlist.findOne({ userId: user._id }).populate('products.productId')
            : null;

        const wishlistProductIds = wishlist
            ? wishlist.products.map((item) => item.productId._id.toString())
            : [];

        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shop', {
            product: productData,
            currentPage: page,
            totalPages,
            search,
            user,
            isLoggedIn,
            currentSort: sortQuery,
            categories,
            currentCategory: categoryQuery,
            wishlistProductIds // Pass wishlist product IDs to the template
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
        const product = await Product.find({ isBlocked: false, quantity: { $gt: 0 } }).limit(8)
        const category = await Category.findOne({ _id: product.category })
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;


        res.render('home', { user, product, category }); // Pass user as null if not logged in



    } catch (error) {
        res.status(500).send("server error")

    }
}

const productDetail = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        const product = await Product.findOne({ _id: id });

        if (!product) {
            return res.status(404).send('Product not found');
        }

        const category = await Category.findOne({ _id: product.category });

        // Fetch the user's wishlist if the user is logged in
        let wishlistProducts = [];
        let cartItems = [];
        if (user) {
            const wishlist = await Wishlist.findOne({ userId: user._id });
            if (wishlist) {
                wishlistProducts = wishlist.products.map(item => item.productId.toString());
            }
            const cart = await Cart.findOne({ userId: user._id });
            if (cart) {
                cartItems = cart.items;
            }
        }

        res.render('productDetail', { product, category, user, wishlistProducts, cartItems });

    } catch (error) {
        console.error('Error fetching product details:', error.message);
        res.render("pageerror");
    }
};


const profile = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;

        res.render('profile', { user })

    } catch (error) {
        res.render("pageerror")

    }
}

const address = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        const addressData = await Address.findOne({ userId: userSession._id });
        res.render('address', { user, userAddress: addressData })

    } catch (error) {
        console.log("in address", error)
        res.render("pageerror")

    }


}

const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user || req.session.googleUser;

        const { addressType, name, address, city, landMark, state, pincode, phone, altPhone } = req.body;

        if (!addressType || !name || !address || !city || !landMark || !state || !pincode || !phone) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const userAddress = await Address.findOne({ userId: userId });
        if (!userAddress) {
            const newAddress = new Address({
                userId,
                address: [{ addressType, name, address, city, landMark, state, pincode, phone, altPhone }]

            });
            await newAddress.save();

        } else {
            userAddress.address.push({ addressType, name, address, city, landMark, state, pincode, phone, altPhone })
            await userAddress.save();
        }
        res.status(200).json({ success: true })
        // res.redirect('/profile')


    } catch (error) {
        console.log("Error adding address", error);
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
        const sortedTransactions = (user.walletTransactions || []).sort((a, b) => {
            return new Date(b.date) - new Date(a.date); // Sort descending by date
        });

        // Fetch wallet balance and transactions
        res.render('wallet', {
            user,
            walletBalance: user.walletBalance || 0, // Default to 0 if not set
            transactions: sortedTransactions || [], // Default to an empty array
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

        const page = parseInt(req.query.page) || 1; // Page number
        const limit = 2; // Number of orders per page
        const skip = (page - 1) * limit; // Skip orders based on page

        // Fetch orders with pagination and populate product details
        const orders = await Order.find({ userId: userSession._id })
            .sort({ createdAt: -1 })
            .populate({
                path: 'items.productId',
                select: 'productName productImage',
            })
            .skip(skip)
            .limit(limit)
            .lean();

        // Count the total number of orders for pagination
        const totalOrders = await Order.countDocuments({ userId: userSession._id });

        const totalPages = Math.ceil(totalOrders / limit); // Calculate total pages

        res.render('orders', {
            user: userSession,
            orders,
            user,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('pageerror');
    }
};





const editAddress = async (req, res) => {
    try {



        const addressId = req.query.id;
        const user = req.session.user || req.session.googleUser;
        const username = await User.findOne({ _id: user._id });


        const currAddress = await Address.findOne({ userId: user._id });

        if (!currAddress) {
            return res.redirect("/pageNotFound")
        }
        const addressData = currAddress.address.find((item) => {
            return item._id.toString() === addressId.toString();
        });

        if (!addressData) {
            return res.redirect('/pageNotFound')
        } else {
            res.render('edit-address', { userAddress: addressData, user: username, addressId });

        }
    } catch (error) {
        console.error("error in edit address", error)
        res.redirect('/pageNotFound')
    }
};

const postEditAddress = async (req, res) => {
    try {
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

        res.status(200).json({ message: 'Address updated successfully' });
    } catch (error) {
        console.error("Error in postEditAddress controller:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const deleteAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        const findAddress = await Address.findOne({ 'address._id': addressId });
        if (!findAddress) {
            return res.status(404).send("Address not found")
        }

        await Address.updateOne({
            "address._id": addressId
        }, {
            $pull: {
                address: {
                    _id: addressId,
                }
            }
        })
        return res.status(200).json({ message: true })
        // res.redirect("/address")


    } catch (error) {
        console.error("Error in delete Address", error)
        res.redirect("/pageNotFound")

    }
}

const getForgetPassPage = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;

        res.render("forgotPassword", { user });

    } catch (error) {
        res.redirect('/pageNotFound')

    }
}

const forgotEmailValid = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;

        const { email } = req.body;
        const findUser = await User.findOne({ email: email });
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPassOtp", { user })
                console.log("otp is :", otp)
            }
            else {
                res.json({ success: false, message: "failed to send otp Please try again" });
            }
        } else {
            res.render("forgotPassword", {
                user,
                message: "User With this email does not exist"
            })
        }

    } catch (error) {
        res.redirect("/pageNotFound")

    }
}

const verifyForgotPassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: '/resetPassword' })
        } else {
            res.json({ success: false, message: "Otp not matching" });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "An error occured Please try again" })

    }
}

const getResetPassPage = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;

        res.render("resetPassword", { user })

    } catch (error) {
        res.render("/pageNotFound")

    }
}

const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.email;
        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1)
            await User.updateOne(
                { email: email },
                { $set: { password: passwordHash } }
            )
            res.redirect("/login")
        } else {
            res.render("resetPassword", { message: 'Password do not match' });
        }

    } catch (error) {
        res.redirect('/pageNotFound')

    }
}

const loadChangePassword = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;

        res.render('changePassword', { user })

    } catch (error) {
        res.render('pageNotFound')

    }
}

const changePassword = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user;
        const user = userSession ? await User.findById(userSession._id) : null;


        const { currentPassword, newPassword } = req.body;
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);

        if (passwordMatch) {
            if (currentPassword == newPassword) {
                return res.render('changePassword', { message: "New password cannot be the same as the current password.", user, title: "Update Password" });
            }
            const passwordHash = await securePassword(newPassword);
            await User.updateOne({ _id: user._id }, { $set: { password: passwordHash } });
            return res.redirect('/profile');
        } else {
            return res.render('changePassword', { message: "Wrong Password", user, title: "Update Password" });
        }

    } catch (error) {
        console.log(error);
        res.redirect('/pageNotfound');
    }
}

const saveUserData = async (req, res) => {
    try {
        const id = req.params.id;
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        const data = req.body
        if (!user) {
            return res.status(400).json('Error User not Found');
        }
        await User.updateOne({ _id: user._id }, {
            username: data.username,
        })
        res.status(200).json("success")

    } catch (error) {

    }
}


const addToCart = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const { productId, quantity } = req.body;
        const MAX_QUANTITY = 5;

        if (!userSession) return res.redirect('/login');

        const user = await User.findById(userSession._id);
        if (!user) return res.redirect('/login');

        const product = await Product.findById(productId);
        if (!product) return res.status(404).send('Product not found');

        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            cart = new Cart({ userId: user._id, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId[0]
        );

        if (existingItemIndex !== -1) {
            const newQuantity = cart.items[existingItemIndex].quantity + Number(quantity);

            if (newQuantity > MAX_QUANTITY) {
                return res.status(400).json({
                    error: 'Maximum quantity limit reached',
                    message: 'Cannot add more items. Maximum limit of 5 items already in cart.'
                });
            }

            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].totalPrice = newQuantity * product.salePrice;
        } else {
            if (Number(quantity) > MAX_QUANTITY) {
                return res.status(400).json({
                    error: 'Maximum quantity limit exceeded',
                    message: 'Cannot add more than 5 items to cart.'
                });
            }

            cart.items.push({
                productId: product._id,
                quantity: Number(quantity),
                price: product.salePrice,
                totalPrice: product.salePrice * Number(quantity)
            });
        }

        await cart.save();
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
        const wishlistProducts = wishlist.products.map((item) => item.productId._id.toString());


        const wishlistItems = wishlist.products.map((item) => ({
            itemId: item._id, // Unique ID of the wishlist item
            productId: item.productId._id, // ID of the product
            name: item.productId.productName, // Product name
            price: item.productId.salePrice || item.productId.regularPrice, // Product price
            imageUrl: item.productId.productImage[0], // First product image
        }));

        res.render('wishlist', { user, wishlist: wishlistItems, wishlistProducts });
    } catch (error) {
        console.error('Error fetching wishlist:', error.message);
        res.render('pageerror');
    }
};


const addToWishlist = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const { productId } = req.body;

        if (!userSession) {
            return res.status(401).json({ message: "Please log in to add items to your wishlist." });
        }

        const user = await User.findById(userSession._id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        let wishlist = await Wishlist.findOne({ userId: user._id });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId: user._id,
                products: [],
            });
        }

        const existingItem = wishlist.products.find((item) =>
            item.productId.toString() === productId
        );

        if (existingItem) {
            return res.status(400).json({ message: "Product already in wishlist." });
        }

        wishlist.products.push({
            productId: product._id,
            addedOn: new Date(),
        });

        await wishlist.save();

        res.status(200).json({ message: "Added to wishlist!", productId });
    } catch (error) {
        console.error("Error adding product to wishlist:", error.message);
        res.status(500).json({ message: "Error adding product to wishlist." });
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


const quantityChange = async (req, res) => {
    try {
        const { quantity, id } = req.body;

        // Find the cart item and extract the productId
        const cartItem = await Cart.findOne({ "items._id": id }, { "items.$": 1 });
        if (!cartItem || cartItem.items.length === 0) {
            return res.status(404).json({ error: "Item not found in cart." });
        }

        const productId = cartItem.items[0].productId;

        // Fetch product details to check stock availability
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        // Determine the maximum allowed quantity
        const maxAllowedQuantity = Math.min(5, product.quantity);

        // Validate the requested quantity
        if (quantity <= 0) {
            return res.status(400).json({ error: "Quantity must be at least 1." });
        }

        if (quantity > product.quantity) {
            if (product.quantity === 0) {
                return res.status(400).json({ error: "This product is out of stock." });
            } else {
                return res.status(400).json({
                    error: `Only ${product.quantity} units available. You requested ${quantity}.`,
                });
            }
        }

        if (quantity > maxAllowedQuantity) {
            return res.status(400).json({
                error: `Maximum limit is ${maxAllowedQuantity} pieces.`,
            });
        }

        const itemPrice = cartItem.items[0].price;

        // Update the quantity and total price
        await Cart.updateOne(
            { "items._id": id },
            {
                $set: {
                    "items.$.quantity": quantity,
                    "items.$.totalPrice": quantity * itemPrice,
                },
            }
        );

        res.status(200).json({
            success: true,
            message: "Quantity updated successfully.",
            updatedQuantity: quantity,
        });
    } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
};





const updateCart = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        if (!user) return res.redirect('/login');

        // Fetch the user's cart
        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) return res.redirect('/cart');

        // Handle removing item from cart
        if (req.body.removeItem) {
            const itemId = req.body.removeItem;
            cart.items = cart.items.filter(item => item._id.toString() !== itemId);
            await cart.save();
            return res.redirect('/cart');
        }

        // Handle quantity update
        if (req.body.quantity) {
            const updatedQuantities = req.body.quantity;
            for (let itemId in updatedQuantities) {
                const quantity = parseInt(updatedQuantities[itemId], 10);

                // Enforce maximum quantity limit
                const limitedQuantity = Math.min(quantity, 10);

                const cartItem = cart.items.find(item => item._id.toString() === itemId);

                if (cartItem) {
                    const product = await Product.findById(cartItem.productId);
                    cartItem.quantity = limitedQuantity;
                    cartItem.totalPrice = product.salePrice * limitedQuantity;
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
                subtotal: 0,
                totalPrice: 0,
                message: null // No messages if cart is empty
            });
        }

        let subtotal = 0;
        const messages = [];

        // Validate stock for all cart items
        for (const item of cart.items) {
            const product = item.productId;

            if (!product) {
                // Skip invalid products and add a message
                messages.push(`A product in your cart is no longer available and has been removed.`);
                await Cart.updateOne(
                    { userId: user._id },
                    { $pull: { items: { _id: item._id } } }
                );
                continue;
            }

            if (item.quantity > product.quantity) {
                const adjustedQuantity = Math.min(item.quantity, product.quantity);

                if (adjustedQuantity === 0) {
                    // Remove out-of-stock items
                    await Cart.updateOne(
                        { userId: user._id },
                        { $pull: { items: { _id: item._id } } }
                    );
                    messages.push(`The product "${product.productName}" is out of stock and has been removed.`);
                } else {
                    // Adjust quantity and total price
                    await Cart.updateOne(
                        { "items._id": item._id },
                        {
                            $set: {
                                "items.$.quantity": adjustedQuantity,
                                "items.$.totalPrice": adjustedQuantity * item.price
                            }
                        }
                    );
                    messages.push(`The quantity for "${product.productName}" was adjusted to ${adjustedQuantity} due to stock limitations.`);
                }
            } else {
                subtotal += item.totalPrice;
            }
        }

        // Fetch updated cart after adjustments
        const updatedCart = await Cart.findOne({ userId: user._id }).populate('items.productId').exec();

        // Recalculate subtotal after adjustments
        subtotal = updatedCart.items.reduce((total, item) => total + item.totalPrice, 0);

        // Calculate shipping and total price
        const shipping = subtotal > 999 ? 0 : 40;
        const totalPrice = subtotal + shipping;

        // Render the cart page with messages
        res.render('cart', {
            user,
            cart: updatedCart,
            subtotal,
            totalPrice,
            message: messages.length > 0 ? messages.join("<br>") : null
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

        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');

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

        // Store coupon details in session
        req.session.couponCode = couponCode;
        req.session.couponDiscount = couponDiscount;

        // Update cart with coupon details
        await Cart.findOneAndUpdate(
            { userId: user._id },
            {
                $set: {
                    couponDiscount,
                    totalPrice
                }
            }
        );

        // Mark coupon as used by this user
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

const couponModal = async (req, res) => {
    try {
        // Fetch all coupons that are active and available to users
        const coupons = await Coupon.find({ isList: true });
        res.status(200).json(coupons); // Return the coupons as JSON
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ message: 'Failed to fetch coupons' });
    }
};



const checkout = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
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

        if (!req.session.couponCode) {
            cart.couponDiscount = 0;
            cart.totalPrice = subtotal;
            await cart.save();
        }

        // Use cart's total price which includes coupon discount
        const totalPrice = cart.totalPrice || subtotal;

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

const removeCoupon = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;

        if (!user) {
            return res.status(401).json({ error: 'User not authenticated.' });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            return res.status(400).json({ error: 'Cart not found.' });
        }

        // Check if a coupon is applied and remove the userId from the coupon
        if (req.session.couponCode) {
            const couponCode = req.session.couponCode;

            // Find the coupon by its code
            const coupon = await Coupon.findOne({ name: couponCode });
            if (coupon) {
                // Remove the user's ID from the coupon's userId array
                coupon.userId = coupon.userId.filter(
                    (id) => id.toString() !== user._id.toString()
                );
                await coupon.save(); // Save the updated coupon
            }
        }

        // Reset coupon details in the cart
        cart.couponDiscount = 0; // Reset the discount
        cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0); // Recalculate the total price
        cart.appliedCoupon = null; // Remove the applied coupon reference
        await cart.save(); // Save the updated cart

        // Clear session coupon details
        req.session.couponCode = null;
        req.session.couponDiscount = null;

        res.status(200).json({ success: 'Coupon removed successfully!' });
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({ error: 'Internal server error.' });
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

        // Ensure subtotal is calculated correctly
        const subtotal = cartItems.items.reduce((total, item) => {
            // Ensure item.totalPrice is a number
            const itemTotal = Number(item.totalPrice) || 0;
            return total + itemTotal;
        }, 0);

        const shippingCharge = subtotal > 499 ? 0 : 40;

        // Ensure coupon discount is a number, default to 0
        const couponDiscount = Number(req.session.couponDiscount) || 0;

        // Calculate total amount and final amount carefully
        const totalAmount = Number(subtotal.toFixed(2));
        const finalAmount = Number((totalAmount + shippingCharge - couponDiscount).toFixed(2));

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
                    amount: Math.round((totalAmount - couponDiscount) * 100), // Ensure amount is an integer for Razorpay
                });

                const newOrder = new Order({
                    userId: user._id,
                    razorpayDetails: {
                        orderId: razorpayOrder.id,
                    },
                    items: cartItems.items.map(item => ({
                        productId: item.productId._id,
                        quantity: item.quantity,
                        totalPrice: Number(item.totalPrice) || 0,
                    })),
                    totalAmount: Number(totalAmount.toFixed(2)),
                    totalCouponDiscount: couponDiscount,
                    finalAmount: finalAmount,
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
                newOrder.paymentStatus = 'Failed';
                await newOrder.save();

                await Cart.findOneAndUpdate(
                    { userId: user._id },
                    { $set: { items: [], totalPrice: 0, couponDiscount: 0 } }
                );

                return res.status(200).json({
                    success: true,
                    message: 'Order placed but Razorpay payment failed. Retry payment from the orders page.',
                    orderId: newOrder._id,
                });
            }

        } else if (paymentMethod === 'COD') {
            const newOrder = new Order({
                userId: user._id,
                items: cartItems.items.map(item => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    totalPrice: Number(item.totalPrice) || 0,
                })),
                totalAmount: Number(totalAmount.toFixed(2)),
                totalCouponDiscount: couponDiscount,
                finalAmount: finalAmount,
                address: selectedAddress,
                paymentMethod,
                status: 'In Transit',
            });

            await newOrder.save();
            await Cart.findOneAndUpdate({ userId: user._id }, { $set: { items: [], totalPrice: 0, couponDiscount: 0 } });

            return res.status(200).json({
                success: true,
                message: 'Order placed successfully with Cash on Delivery',
                orderId: newOrder._id,
            });
        } else if (paymentMethod === 'wallet') {
            if (user.walletBalance < finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance',
                });
            }
            const newOrder = new Order({
                userId: user._id,
                items: cartItems.items.map(item => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    totalPrice: Number(item.totalPrice) || 0,
                })),
                totalAmount: Number(totalAmount.toFixed(2)),
                totalCouponDiscount: couponDiscount,
                finalAmount: finalAmount,
                address: selectedAddress,
                paymentMethod,
                status: 'In Transit',
                paymentStatus: 'Paid'
            });
            await newOrder.save();

            user.walletBalance -= finalAmount;
            user.walletTransactions.push({
                detail: `Payment for Order : ${newOrder.orderId}`,
                amount: finalAmount,
                type: 'debit',
            });

            await user.save();




            await Cart.findOneAndUpdate({ userId: user._id }, { $set: { items: [], totalPrice: 0, couponDiscount: 0 } });

            return res.status(200).json({
                success: true,
                message: 'Order placed successfully using wallet payment',
                orderId: newOrder._id,
            });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order', error: error.message });
    }
};

const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order || order.paymentStatus !== 'Pending') {
            console.log('Invalid order:', order);
            return res.status(400).json({
                success: false,
                message: 'Invalid order for retrying payment.',
            });
        }

        const razorpayOrder = await razorpayInstance.orders.create({
            currency: 'INR',
            receipt: `${order.userId}_${Date.now()}`,
            amount: Math.round(order.finalAmount * 100),
        });


        order.razorpayDetails.orderId = razorpayOrder.id;
        await order.save();

        await Cart.findOneAndUpdate(
            { userId: order.userId },
            { $set: { items: [], totalPrice: 0, couponDiscount: 0 } }
        );

        return res.status(200).json({
            success: true,
            message: 'Retry payment initiated successfully',
            razorpayOrderId: razorpayOrder.id,
            razorpayKey: process.env.RAZORPAY_KEY,
            totalAmount: order.finalAmount,
        });
    } catch (error) {
        console.error('Error in retryPayment:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retry payment.',
        });
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

        if (order.paymentStatus !== 'Paid') {
            return res.status(400).json({ message: 'Only paid orders can be refunded to the wallet.' });
        }

        const user = await User.findById(userSession._id);
        const couponDiscount = req.session.couponDiscount || 0;
        console.log(couponDiscount,"discount")
        const refundAmount = order.finalAmount - couponDiscount;
        console.log(refundAmount)
        user.walletBalance += refundAmount;

        user.walletTransactions.push({
            detail: `Refund for Order ID : ${order.orderId}`,
            amount: refundAmount,
            type: 'credit',
            date: new Date()  // Add current date for the transaction
        });

        order.paymentStatus = 'Refunded';
        order.status = 'Returned';

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






const orderComplete = async (req, res) => {
    try {
        const userSession = req.session.user || req.session.googleUser;
        const user = userSession ? await User.findById(userSession._id) : null;
        res.render('orderComplete', { user });

    } catch (error) {
        res.render('pageerror')

    }

}


const cancelOrder = async (req, res) => {
    try {
        const { reason } = req.body; // Reason sent from the front-end
        const orderId = req.params.id;

        // Fetch the order and populate product details
        const order = await Order.findById(orderId).populate({
            path: 'items.productId',
            select: 'productName quantity status',
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

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const couponDiscount = req.session.couponDiscount || 0;
            const refundAmount = order.totalAmount - couponDiscount;
            user.walletBalance += refundAmount;
            order.paymentStatus = 'Refunded';

            user.walletTransactions.push({
                detail: `Refund for Order ID ${orderId}`,
                amount:refundAmount,
                type: 'credit',
            });

            await user.save();
            await order.save();
        }

        // Add the cancellation reason and update order status
        order.cancellationReason = reason;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: 'Cancelled', cancellationReason: reason },
            { new: true }
        );

        res.status(200).json({ success: true, message: 'Order cancelled and stock updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error', error });
    }
};


const returnOrder = async (req, res) => {
    try {
        const { reason } = req.body; // Reason sent from the front-end
        const orderId = req.params.id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }


        // Add the return reason
        order.returnReason = reason;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: 'Return Request Sent', returnReason: reason }, // Adding returnReason field
            { new: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error returning order:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate({
            path: 'items.productId',
            select: 'productName price',
        });

        if (!order) {
            console.log('Order not found:', orderId);
            return res.status(404).json({ error: 'Order not found' });
        }

        // Create a new PDF document
        const doc = new PDFDocument({ size: "A4", margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);

        // Pipe the PDF to the response
        doc.pipe(res);

        // Helper functions
        const generateHr = (y) => {
            doc
                .strokeColor("#aaaaaa")
                .lineWidth(1)
                .moveTo(50, y)
                .lineTo(550, y)
                .stroke();
        };

        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-IN');
        };

        // Generate Header
        doc
            .fillColor("#000000")  // CaseVerse brand color
            .fontSize(30)
            .font('Times-Roman')
            .text("CaseVerse", 50, 45)
            .fontSize(10)
            .font('Helvetica')
            .text("www.caseverse.in", 50, 80)
            .text("caseverseofficial@gmail.com", 50, 95)
            .moveDown();

        // Generate Customer Information
        doc
            .fillColor("#444444")
            .fontSize(20)
            .text("INVOICE", 50, 160);

        generateHr(185);

        const customerInformationTop = 200;

        doc
            .fontSize(10)
            // Left side - Invoice details
            .text("Invoice Number:", 50, customerInformationTop)
            .font("Helvetica-Bold")
            .text(order.orderId, 150, customerInformationTop)
            .font("Helvetica")
            .text("Date:", 50, customerInformationTop + 15)
            .text(formatDate(order.createdAt), 150, customerInformationTop + 15)
            .text("Payment Method:", 50, customerInformationTop + 30)
            .text(order.paymentMethod, 150, customerInformationTop + 30)

            // Middle section - Shipping Address
            .font("Helvetica-Bold")
            .text("Shipping Address", 300, customerInformationTop)
            .font("Helvetica")
            .text(order.address.name, 300, customerInformationTop + 15)
            .text(order.address.address, 300, customerInformationTop + 30)
            .text(
                `${order.address.city}, ${order.address.state} - ${order.address.pincode}`,
                300,
                customerInformationTop + 45
            )
            .text(`Phone: ${order.address.phone}`, 300, customerInformationTop + 60)


            .font("Helvetica-Bold")
            .text("Sold By:", 450, customerInformationTop)
            .font("Helvetica")
            .text("Caseverse India", 450, customerInformationTop + 15)
            .text("Kannur, Kerala", 450, customerInformationTop + 30)
            .text("PIN: 670593", 450, customerInformationTop + 45)
            .text("Phone: 6235009441", 450, customerInformationTop + 60)
            .moveDown();

        generateHr(customerInformationTop + 85);

        // Generate Table
        let i;
        const invoiceTableTop = 330;
        const tableTop = invoiceTableTop;

        doc.font("Helvetica-Bold");
        // Table header
        doc
            .fontSize(10)
            .text("Item", 50, tableTop)
            .text("Quantity", 300, tableTop, { width: 90, align: "center" })
            .text("Price", 350, tableTop, { width: 90, align: "right" })
            .text("Total", 450, tableTop, { width: 90, align: "right" });

        generateHr(tableTop + 20);
        doc.font("Helvetica");

        // Initialize variables for calculations
        let position = 0;
        let itemsTotal = 0; // Moved the declaration here, before the loop

        // Table items
        order.items.forEach((item, index) => {
            const singleItemPrice = item.totalPrice / item.quantity; // Get price of single item
            const itemAmount = item.totalPrice; // Total for this item with quantity
            itemsTotal += itemAmount;

            position = tableTop + (index + 1) * 30;
            doc
                .fontSize(10)
                .text(item.productId.productName, 50, position)
                .text(item.quantity.toString(), 300, position, { width: 90, align: "center" })
                .text((singleItemPrice), 350, position, { width: 90, align: "right" })
                .text((itemAmount), 450, position, { width: 90, align: "right" });

            generateHr(position + 20);
        });

        // Calculate positions for summary
        const subtotalPosition = position + 35;
        doc.font("Helvetica-Bold");

        // Calculate GST amount based on itemsTotal
        const gstAmount = itemsTotal * 0.18;
        const gstPosition = subtotalPosition + 20;

        // Add summary with proper structure
        doc
            .fontSize(10)
            .text("Subtotal", 350, subtotalPosition, { width: 90, align: "right" })
            .text((itemsTotal), 450, subtotalPosition, { width: 90, align: "right" });

        // Add coupon discount if exists
        if (order.totalCouponDiscount > 0) {
            doc
                .fontSize(10)
                .text("Discount", 350, gstPosition, { width: 90, align: "right" })
                .text(`-${(order.totalCouponDiscount)}`, 450, gstPosition, { width: 90, align: "right" });
        }

        // Calculate positions for GST
        const gstStartPosition = order.totalCouponDiscount > 0 ? gstPosition + 20 : gstPosition;

        // Add GST details
        doc
            .fontSize(10)
            .text("CGST (9%)", 350, gstStartPosition, { width: 90, align: "right" })
            .text((gstAmount / 2).toFixed(2), 450, gstStartPosition, { width: 90, align: "right" });

        doc
            .fontSize(10)
            .text("SGST (9%)", 350, gstStartPosition + 20, { width: 90, align: "right" })
            .text((gstAmount / 2).toFixed(2), 450, gstStartPosition + 20, { width: 90, align: "right" });

        // Add total GST
        doc
            .fontSize(10)
            .text("Total GST (18%)", 350, gstStartPosition + 40, { width: 90, align: "right" })
            .text(gstAmount.toFixed(2), 450, gstStartPosition + 40, { width: 90, align: "right" });

        // Calculate final total position
        const totalPosition = gstStartPosition + 60;

        // Calculate final amount (subtotal + GST - discount)
        const finalAmount = itemsTotal - (order.totalCouponDiscount || 0);

        // Add final amount
        doc
            .fontSize(12)
            .text("Total Amount", 350, totalPosition, { width: 90, align: "right" })
            .text((finalAmount.toFixed(2)), 450, totalPosition, { width: 90, align: "right" });

        // Footer
        doc
            .fontSize(10)
            .font('Helvetica')
            .text(
                "Thank you for shopping with CaseVerse!",
                50,
                780,
                { align: "center", width: 500 }
            );

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('Error in downloadInvoice:', error);
        res.status(500).json({ error: 'Error generating invoice' });
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
    retryPayment,
    orderComplete,
    cancelOrder,
    returnOrder,
    addToWishlist,
    addToCartFromWishlist,
    removeFromWishlist,
    verifyPayment,
    refundToWallet,
    couponModal,
    removeCoupon,
    downloadInvoice,
}
