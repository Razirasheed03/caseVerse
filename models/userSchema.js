const { name } = require("ejs");
const mongoose=require("mongoose")
const {Schema}=mongoose;
const userSchema=new Schema({
    username: {
        type: String,
        required:true,
      
    },
    email: {
        type: String,
        required:true,
        unique: false,
      },
      password: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        required: false,
        sparse:true,
        default:null,
      },
      googleId:{
        type:String,
        unique:true,
      },
      isAdmin: {
        type: Boolean,
        default: false,
      },
      isBlocked:{
        type:Boolean,
      },
      walletBalance: {
        type: Number,
        default: 0,
    },
    walletTransactions: [
        {
            detail: { type: String, required: true },
            amount: { type: Number, required: true },
            type: { type: String, enum: ['credit', 'debit'], required: true },
            date: { type: Date, default: Date.now },
        },
    ],

},{timestamp:true})


module.exports = mongoose.model("User", userSchema)