const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Order = require("../../models/orderSchema")
const Product = require("../../models/productSchema")
const Cart = require("../../models/cartSchema")
const User = require("../../models/userSchema")

const adminOrders = async (req, res) => {
    try {
        const adminOrders = await Order.find().sort({ createdAt: -1 });
        console.log(adminOrders, "1")
        res.render('adminOrders', {
            orders: adminOrders
        })

    } catch (error) {
        console.error("error in orders", error)
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
            user.walletBalance += order.finalAmount;
            user.walletTransactions.push({
                detail: `Refund for Returned Order ID ${order._id}`,
                amount: order.finalAmount,
                type: 'credit',
            });

            await user.save();

            order.paymentStatus = 'Refunded';
            await order.save();
        }

        if (data === 'Delivered') {
            order.paymentStatus = 'Paid';
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
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 30 });

            // Set response headers for PDF
            const filename = `sales_report_${Date.now()}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

            // Stream the document to the response
            doc.pipe(res);
            // Header Section
            doc.fillColor("#000000")
                .fontSize(30)
                .font('Times-Roman')
                .text("CaseVerse", 50, 45)
                .fontSize(10)
                .font('Helvetica')
                .text("www.caseverse.in", 50, 80)
                .text("caseverseofficial@gmail.com", 50, 95)
                .moveDown();


            // Report Title
            doc.fontSize(20).text('Sales Report', { align: 'center' });
            doc.moveTo(70, doc.y + 10)  // Adjust horizontal position and vertical offset
                .lineTo(500, doc.y + 10) // Adjust width of the line
                .stroke("#000000");
            doc.moveDown(2);


            // Report Summary
            doc.fontSize(12)
                .text(`Filter: ${filter || 'Custom Range'}`)
                .text(`Start Date: ${startDate || 'N/A'}`)
                .text(`End Date: ${endDate || 'N/A'}`)
                .text(`Total Sales: ${totalSales}`)
                .text(`Total Discount: ${totalCouponDiscount}`)
                .text(`Total Orders: ${totalOrders}`);
            doc.moveDown(2);

            // Table Configuration
            const tableTop = doc.y;
            const colWidths = [150, 100, 150, 150];
            const tableMarginLeft = 30;
            const colPositions = colWidths.reduce((positions, width, index) => {
                positions.push(index === 0 ? tableMarginLeft : positions[index - 1] + colWidths[index - 1]);
                return positions;
            }, []);

            // Table Headers
            const headers = ['Order ID', 'Date', 'Total Amount (Rs)', 'Coupon Discount (Rs)'];
            headers.forEach((header, i) => {
                doc.font('Helvetica-Bold')
                    .fontSize(12)
                    .text(header, colPositions[i], tableTop, { width: colWidths[i], align: 'center' });
            });

            // Draw a line under headers
            doc.moveTo(tableMarginLeft, tableTop + 15)
                .lineTo(tableMarginLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15)
                .stroke();

            // Table Rows
            const rowHeight = 20;
            const maxRowsPerPage = Math.floor((doc.page.height - tableTop - 50) / rowHeight);
            let rowY = tableTop + 20;

            // Use the filtered `orders` for the table rows
            orders.forEach((order, index) => {
                if ((index + 1) % maxRowsPerPage === 0 && index !== 0) {
                    doc.addPage();
                    rowY = 30;

                    // Redraw headers on new page
                    headers.forEach((header, i) => {
                        doc.font('Helvetica-Bold')
                            .fontSize(12)
                            .text(header, colPositions[i], rowY, { width: colWidths[i], align: 'center' });
                    });

                    doc.moveTo(tableMarginLeft, rowY + 15)
                        .lineTo(tableMarginLeft + colWidths.reduce((a, b) => a + b, 0), rowY + 15)
                        .stroke();

                    rowY += 20;
                }

                const date = new Date(order.createdAt).toLocaleDateString();
                const row = [
                    order.orderId,
                    date,
                    `${order.totalAmount || 0}/-`,
                    `${order.totalCouponDiscount || 0}/-`,
                ];

                row.forEach((cell, i) => {
                    doc.font('Helvetica')
                        .fontSize(10)
                        .text(cell, colPositions[i], rowY, { width: colWidths[i], align: 'center' });
                });

                rowY += rowHeight;

                // Draw a line under each row
                doc.moveTo(tableMarginLeft, rowY - 10)
                    .lineTo(tableMarginLeft + colWidths.reduce((a, b) => a + b, 0), rowY - 10)
                    .stroke();
            });

            // Footer
            doc.moveDown(2);
            doc.fontSize(10).text("CaseVerse signature", { align: 'center', italics: true });

            // Finalize the document
            doc.end();
            return;
        }




        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Sales Report');

            // Add additional columns for product-level details
            sheet.columns = [
                { header: 'Order ID', key: 'orderId', width: 20 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Quantity', key: 'quantity', width: 10 },
                { header: 'Total Price', key: 'totalPrice', width: 15 },
                { header: 'Coupon Discount', key: 'couponDiscount', width: 15 },
            ];

            // Iterate through each order and its products
            orders.forEach((order) => {
                order.items.forEach((item) => {
                    const product = item.productId; // Populated product data

                    // Add each product's details in a new row
                    sheet.addRow({
                        orderId: order.orderId,
                        date: new Date(order.createdAt).toLocaleDateString(),
                        quantity: item.quantity,
                        totalPrice: item.totalPrice,
                        couponDiscount: order.totalCouponDiscount || 0, // Coupon discount at order level
                    });
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





module.exports = {

    adminOrders,
    orderDetail,
    changeStatus,
    salesReport,





}
