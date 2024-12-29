const User=require('../../models/userSchema');
const Order=require('../../models/orderSchema');
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");


const logout=async(req,res)=>{
    try{
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err);
                return res.redirect("/pageerror")
            }
            res.redirect("/admin/login")
        })
    }catch(error){
        console.log("Unexpected error during logout",error);
        res.redirect("/pageerror")

    }
}


const pageerror=async(req,res)=>{
    res.render("admin-error")
}

const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin")
    }
    res.render("admin-login",{message:null})
}

const login=async(req,res)=>{
    try {
        const {email,password}=req.body;///finding admin(checking also )
         const admin=await User.findOne({email,isAdmin:true})
         if(admin){
            const passwordMatch=await bcrypt.compare(password,admin.password);  ///await
            if(passwordMatch){
                req.session.admin=true;
                return res.redirect("/admin")
            }else{
                return res.redirect("/admin/login")
            }

         }else{
            return res.redirect("/admin/login")
         }
    } catch (error) {
        console.log("login error",error);
        return res.redirect("/pageerror")
    }
}

const loadDashboard = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }

    try {
        const adminOrders = await Order.find()
            .populate('items.productId')
            .sort({ createdAt: -1 });

        // Calculate revenue metrics
        const revenueMetrics = {
            totalSales: Number(adminOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toFixed(2)),
            totalCouponDiscount: Number(adminOrders.reduce((sum, order) => sum + (order.totalCouponDiscount || 0), 0).toFixed(2)),
            totalOrders: adminOrders.length
        };


        const categoryRevenue = await Order.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$category.name',
                    totalRevenue: { $sum: '$items.totalPrice' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);


        // Improved aggregation for best selling products
        const bestSellingProducts = await Order.aggregate([
            { 
                $match: { 
                    status: { $nin: ['Cancelled', 'Returned', 'Return Request Sent'] }
                } 
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $project: {
                    productName: '$productDetails.productName',
                    totalQuantity: 1
                }
            }
        ]);

        res.render("dashboard", {
            adminOrders,
            revenueMetrics,
            categoryRevenue,
            bestSellingProducts
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.redirect("/pageerror");
    }
};





module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
    

}