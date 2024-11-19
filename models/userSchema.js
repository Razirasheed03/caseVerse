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
        unique: true,
      },
      password: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: false,
      },
      isAdmin: {
        type: Boolean,
        default: false,
      },
      idblocked:{
        type:Boolean,
      }


},{timestamp:true})


module.exports = mongoose.model("User", userSchema)