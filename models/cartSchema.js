const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
            totalPrice: { type: Number, required: true }, // Ensure this exists
        },
    ],
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product', // Correctly references the Product model
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        price: {
            type: Number,
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            default: 'placed'
        },
        cancellationReason: {
            type: String,
            default: "none"
        }
    }]
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
