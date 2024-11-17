const mongoose=require('mongoose');
const env=require("dotenv").config();

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DataBase Connected")
    } catch (error) {
        console.log("DataBase Not Connected",error.message)
        
    }
}

module.exports=connectDB;