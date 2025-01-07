const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// For Getting all coupons
const coupons = async (req, res) => {
    try {
        if (!req.session.adminId || !req.session.isAdmin) {
            return res.redirect("/admin/login");
        }

        // Verify admin exists and has privileges
        const admin = await User.findOne({ 
            _id: req.session.adminId, 
            isAdmin: true 
        });

        if (!admin) {
            // Clear invalid session
            req.session.destroy((err) => {
                if (err) {
                    console.log("Error destroying invalid session:", err);
                }
                return res.redirect("/admin/login");
            });
        }
        const coupons = await Coupon.find().sort({ createdOn: -1 });
        res.render('coupon', { coupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).render('pageerror', { message: 'Error fetching coupons.' });
    }
};

// For Adding a new coupon
const addCoupon = async (req, res) => {
    try {
        const { name, createdOn, expireOn, offerPrice, minimumPrice } = req.body;

        const newCoupon = new Coupon({
            name,
            createdOn: createdOn ? new Date(createdOn) : new Date(),
            expireOn: new Date(expireOn),
            offerPrice,
            minimumPrice,
        });

        await newCoupon.save();
        res.redirect('/admin/coupon');  // Corrected redirect path to match the route
    } catch (error) {
        if (error.code === 11000) {
            console.error('Duplicate key error:', error);
            res.status(400).render('pageerror', { message: `Coupon with the name "${req.body.name}" already exists.` });
        } else {
            console.error('Error adding coupon:', error);
            res.status(500).render('pageerror', { message: 'Internal Server Error' });
        }
    }
};

// For Deleting a coupon
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await Coupon.findByIdAndDelete(id);
        res.status(200).json({ message: 'Coupon deleted successfully' }); // Respond with success
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ message: 'Error deleting coupon' }); // Respond with error
    }
};


module.exports = {
    addCoupon,
    coupons,
    deleteCoupon,
};
