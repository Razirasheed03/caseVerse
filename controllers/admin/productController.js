const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const User=require("../../models/userSchema")
const fs=require("fs");
const path=require("path");
const sharp = require("sharp");///for resizing images
const multer = require('multer');

const getProductAddPage=async(req,res)=>{
    try {
        const category=await Category.find({isListed:true});
        res.render("product-add",{
            cat:category,
        });
        
    } catch (error) {
        res.redirect("/pageerror")
        
    }
};

const addProducts=async(req,res)=>{
    try {
        const products=req.body;
        const productExists=await product.findOne({
            productName:products.productName,
        });
        if(!productExists){
            const images=[];

            ////using for loop accessing path of images
            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath=req.files[i].path;

                    const resizedImagesPath=path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagesPath);
                    images.push(req.files[i].filename);

                }
            }/////nnnnnnnnn
            if(!products.category){
                return res.status(400).json("Category is required");
            }

            const categoryId=await Category.findOne({name:products.category});
            if(!categoryId){
                return res.status(400).json("Invalid Category name")
            }
            const newProduct=new Product({
                productName:products.productName,
                description:products.description,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                color:products.color,
                productImage:images,
                status:'Available',

            });
            await newProduct.save();
            return res.redirect("/admin/addProducts");
        }else{
            return res.status(400).json("product already exist.Please try with another product")
        }
    } catch (error) {
        console.error("Error in saving product",error.message);
        return res.redirect("/admin/pageerror")
 }
}

module.exports={
    getProductAddPage,
    addProducts,
}