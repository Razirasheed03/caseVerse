const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const { Schema } = mongoose;

const orderSchema = new Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        default: function () {
            return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        },
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                default: 1,
            },
            totalPrice: {
                type: Number,
                required: true,
            },
        },
    ],
    totalAmount: {
        type: Number,
        required: true,
    },
    finalAmount: {
        type: Number,
        required: true,
    },
    address: {
        type: Object,
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'wallet','razorpay'],
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Refunded','Failed'],
        default: 'Pending',
    },
    status: {
        type: String,
        enum: ['In Transit', 'Delivered', 'Cancelled','Return Request Sent','Returned','Return Request Denied'],
        default: 'In Transit',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date, 
        default: Date.now,
    },
    razorpayDetails:{
        orderId:{type:String},
        paymentId:{type:String},
        signature:{type:String}
    },
    totalCouponDiscount: { type: Number, default: 0 },
    cancellationReason: { type: String, default: '' }, // Added cancellationReason field
    returnReason: { type: String, default: '' }, // Added returnReason field
});

// Pre-save hook for calculating final amounts and timestamps
orderSchema.pre('save', function (next) {
    if (!this.orderId) {
        this.orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);
