const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product', // Reference Product model
                required: true
            },
            quantity: {
                type: Number,
                default: 1
            },
            price: {
                type: Number,
                required: true // Unit price of the product
            },
            totalPrice: {
                type: Number,
                required: true // Total for this product (price * quantity)
            }
        }
    ],
    couponDiscount: {
        type: Number,
        default: 0 // Cart-wide discount
    },
    totalPrice: {
        type: Number,
     // Total price for the entire cart after discounts
    },
    status: {
        type: String,
        default: 'placed'
    },
    cancellationReason: {
        type: String,
        default: 'none'
    }
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
