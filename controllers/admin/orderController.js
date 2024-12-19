const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Order = require("../../models/orderSchema")
const Product=require("../../models/productSchema")
const Cart=require("../../models/cartSchema")
const User=require("../../models/userSchema")

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
        const id = req.query.id; // Ensure this matches the frontend URL
        console.log("Order ID from query:", id);

        // Fetch order with populated product details
        const orders = await Order.findOne({ _id: id }).populate({
            path: 'items.productId',
            model: 'Product', // Ensure Product is correctly imported
        });

        console.log("Fetched Order:", orders);

        if (!orders) {
            return res.render('orderDetail', { orders: null, selectedAddress: null }); // Pass null to indicate no orders found
        }

        // Extract the selected address from the order
        const selectedAddress = orders.address; // Assuming `address` is part of the order schema

        res.render('orderDetail', { orders, selectedAddress });
    } catch (error) {
        console.error("Error fetching order:", error);
        res.render('pageerror', { error: "Error fetching order details." });
    }
};


const changeStatus = async (req, res) => {
    try {
        const { data, id } = req.body; // `data` is the status, `id` is the order ID
        console.log(data, id);

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (data === 'Returned') {
            const user = await User.findById(order.userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Add the refunded amount to the user's wallet
            user.walletBalance += order.finalAmount;
            await user.save();

            // Optionally, update the payment status in the order
            order.paymentStatus = 'Refunded';
            await order.save();
        }
        if(data==='Delivered'){
            order.paymentStatus='Paid';
            await order.save();
        }

        // Update the order status
        await Order.updateOne({ _id: id }, { $set: { status: data } });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const salesReport = async (req, res) => {
    try {
        const { filter = '', startDate = '', endDate = '', format } = req.query;

        let query = {};
        const currentDate = new Date();

        if (filter === 'daily') {
            query.createdAt = {
                $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                $lt: new Date(currentDate.setHours(23, 59, 59, 999)),
            };
        } else if (filter === 'weekly') {
            query.createdAt = {
                $gte: new Date(currentDate.setDate(currentDate.getDate() - 7)),
                $lt: new Date(),
            };
        } else if (filter === 'yearly') {
            query.createdAt = {
                $gte: new Date(currentDate.getFullYear(), 0, 1),
                $lt: new Date(),
            };
        } else if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const orders = await Order.find(query);

        const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const totalCouponDiscount = orders.reduce((sum, order) => sum + (order.totalCouponDiscount || 0), 0);
        const totalOrders = orders.length;

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30 });

            // Set response headers for PDF
            const filename = `sales_report_${Date.now()}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

            // Stream the document to the response
            doc.pipe(res);

            // Report Title
            doc.fontSize(20).text('Sales Report', { align: 'center' });
            doc.moveDown();

            // Report Summary
            doc.fontSize(12).text(`Filter: ${filter || 'Custom Range'}`);
            doc.text(`Total Sales: ₹${totalSales}`);
            doc.text(`Total Discount: ₹${totalCouponDiscount}`);
            doc.text(`Total Orders: ${totalOrders}`);
            doc.moveDown();

            // Table Headers
            const tableTop = doc.y;
            const columnMargins = [170, 150, 150, 150]; // Column widths
            const headers = ['Order ID', 'Date', 'Total Amount (₹)', 'Coupon Discount (₹)'];

            // Draw header row
            headers.forEach((header, i) => {
                doc.font('Helvetica-Bold')
                   .text(header, columnMargins.slice(0, i).reduce((a, b) => a + b, 0), tableTop, {
                       continued: i < headers.length - 1,
                       width: columnMargins[i],
                   });
            });

            doc.moveDown();

            // Draw order rows
            let rowY = tableTop + 20;
            orders.forEach((order) => {
                const date = new Date(order.createdAt).toLocaleDateString();
                const row = [
                    order.orderId,
                    date,
                    `₹${order.totalAmount || 0}`,
                    `₹${order.totalCouponDiscount  || 0}`,
                ];

                row.forEach((cell, i) => {
                    doc.font('Helvetica')
                       .text(cell, columnMargins.slice(0, i).reduce((a, b) => a + b, 0), rowY, {
                           continued: i < row.length - 1,
                           width: columnMargins[i],
                       });
                });

                rowY += 20;

                // Draw row border lines
                doc.moveTo(30, rowY - 10)
                   .lineTo(500, rowY - 10)
                   .stroke();
            });

            // Footer
            doc.moveDown(2);
            doc.fontSize(10).text('Generated by Sales System', { align: 'center' });

            // Finalize the document
            doc.end();
            return;
        }


        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Sales Report');

            sheet.columns = [
                { header: 'Order ID', key: 'orderId', width: 20 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Total Amount', key: 'totalAmount', width: 15 },
                { header: 'Coupon Discount', key: 'couponDiscount', width: 15 },
            ];

            orders.forEach((order) => {
                sheet.addRow({
                    orderId: order.orderId,
                    date: new Date(order.createdAt).toLocaleDateString(),
                    totalAmount: order.totalAmount || 0,
                    couponDiscount: order.couponDiscount || 0,
                });
            });

            const filename = `sales_report_${Date.now()}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            await workbook.xlsx.write(res);
            return;
        }

        res.render('salesReport', {
            orders,
            totalSales,
            totalCouponDiscount,
            totalOrders,
            filter,
            startDate,
            endDate,
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageerror');
    }
};





module.exports={

adminOrders,
orderDetail,
changeStatus,
salesReport,





}
