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
    const message = req.query.message || null;
    if(req.session.admin){
        return res.redirect("/admin")
    }
    res.render("admin-login",{message})
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the admin user
        const admin = await User.findOne({ email, isAdmin: true });
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect("/admin");
            } else {
                return res.redirect("/admin/login?message=Incorrect Password");
            }
        } else {
            return res.redirect("/admin/login?message=Admin not found");
        }
    } catch (error) {
        console.log("login error", error);
        return res.redirect("/pageerror");
    }
};



const loadDashboard = async (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login');
    }

    try {
        const { filter } = req.query; // Filter based on date range
        const dateRange = getDateRange(filter);

        // Debugging filter and date range
        console.log('Filter:', filter);
        console.log('Date Range:', dateRange);

        const adminOrders = await Order.find({
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }).populate('items.productId').sort({ createdAt: -1 });

        const revenueMetrics = {
            totalSales: Number(adminOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toFixed(2)),
            totalCouponDiscount: Number(adminOrders.reduce((sum, order) => sum + (order.totalCouponDiscount || 0), 0).toFixed(2)),
            totalOrders: adminOrders.length,
        };

        const categoryRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: dateRange.start, $lte: dateRange.end } } },
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
            { $sort: { totalRevenue: -1 } }
        ]);

        const bestSellingProducts = await Order.aggregate([
            { $match: { createdAt: { $gte: dateRange.start, $lte: dateRange.end } } },
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

        res.render('dashboard', {
            encodedCategoryRevenue: JSON.stringify(categoryRevenue),
            encodedBestSellingProducts: JSON.stringify(bestSellingProducts),
            revenueMetrics,
            selectedFilter: filter,
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.redirect('/pageerror');
    }
};



// Utility function for date range
function getDateRange(filter) {
    const now = new Date();
    let start, end;

    switch (filter) {
        case 'weekly':
            start = new Date(now.setDate(now.getDate() - now.getDay())); // Start of the week
            end = new Date(start);
            end.setDate(start.getDate() + 6); // End of the week
            end.setHours(23, 59, 59);
            break;
        case 'monthly':
            start = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of the month
            break;
        case 'yearly':
            start = new Date(now.getFullYear(), 0, 1); // Start of the year
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // End of the year
            break;
        default:
            start = new Date(0); // All-time: start from epoch
            end = now; // Current time
    }
    return { start, end };
}







module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
    

}