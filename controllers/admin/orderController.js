
const Order = require("../../models/orderSchema")

const Product=require("../../models/productSchema")
const Cart=require("../../models/cartSchema")

const adminOrders=async(req,res)=>{
    try {
        const adminOrders = await Order.find();
        console.log(adminOrders,"1")
        res.render('adminOrders',{
            orders:adminOrders})
        
    } catch (error) {
        console.error("error in orders",error)
        res.render('pageerror')
        
    }
}

const orderDetail = async (req, res) => {
    try {
        const id = req.query.id; // Ensure this matches your frontend URL
        console.log("Order ID from query:", id);

        // Fetch order with populated product details
        const orders = await Order.findOne({ _id: id }).populate({
            path: 'items.productId',
            model: 'Product', // Ensure Product is correctly imported
        });
        // const quantity=await Cart.findOne({ "items._id": id },"items.$.quantity")
        // console.log(quantity)

        console.log("Fetched Order:", orders);

        if (!orders) {
            return res.render('orderDetail', { orders: null }); // Pass null to indicate no orders found
        }

        res.render('orderDetail', { orders });
    } catch (error) {
        console.error("Error fetching order:", error);
        res.render('pageerror', { error: "Error fetching order details." });
    }
};

const changeStatus=async(req,res)=>{
    try {
        const {data,id}=req.body
        console.log(data,id)
        await Order.updateOne({_id:id},{$set:{status:data}})
        res.status(200).json({success:true});
        
    } catch (error) {

        
    }
}
module.exports={

adminOrders,
orderDetail,
changeStatus,





}
