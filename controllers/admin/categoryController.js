const Category = require("../../models/categorySchema");
const Product=require("../../models/productSchema")
const User=require("../../models/userSchema")



const categoryInfo = async (req, res) => {
    try {
        if (!req.session.adminId || !req.session.isAdmin) {
            return res.redirect("/admin/login");
        }

        // Verify admin exists and has privileges
        const admin = await User.findOne({ 
            _id: req.session.adminId, 
            isAdmin: true 
        });

        if (!admin) {
            // Clear invalid session
            req.session.destroy((err) => {
                if (err) {
                    console.log("Error destroying invalid session:", err);
                }
                return res.redirect("/admin/login");
            });
        }
        const page = parseInt(req.query.page) || 1; // Accessing query params from the frontend
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
        });

    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
};

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    
    try {
        const existingCategory = await Category.findOne({ name: { $regex: name, $options: 'i' } });

        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const newCategory = new Category({
            name,
            description,
        });

        await newCategory.save();
        return res.json({ message: "Category added successfully" });
    } catch (error) {
        console.error("Error adding category:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const addCategoryOffer = async (req, res) => {
    try {
      const percentage = parseInt(req.body.percentage);
      const categoryId = req.body.categoryId;
  
      // Finding category by its ID
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
  
      // Checking if any products in this category already have a higher offer
      const products = await Product.find({ category: category._id }); 
      const hasProductOffer = products.some((product) => product.productOffer > percentage);
  
      if (hasProductOffer) {
        return res.json({
          status: false,
          message: "Products within this category already have a higher offer",
        });
      }
  
      // Update the category with the new offer percentage
      await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
  
      // Update products within the category
      for (const product of products) {
        product.productOffer = percentage;
        product.salePrice = Math.floor(product.regularPrice * (1 - percentage / 100));
        await product.save();
      }
  
      res.json({ status: true, message: "Category offer added successfully" });
  
    } catch (error) {
      console.error("Error in addCategoryOffer:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };
  

  const removeCategoryOffer = async (req, res) => {

    
    try {
      const categoryId = req.body.categoryId;
  
      // Finding category by its ID
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ status: false, message: "Category not found" });
      }
  
      const percentage = category.categoryOffer;
  
      // Finding products within this category
      const products = await Product.find({ category: category._id });
  
      // Resetting offer prices back to regular price
      if (products.length > 0) {
        for (const product of products) {
          product.salePrice = product.regularPrice; // Restore the original price
          product.productOffer = 0; // Remove the product offer
          await product.save();
        }
      }
  
      // Resetting the category offer
      category.categoryOffer = 0;
      await category.save();
  
      res.json({ status: true, message: "Category offer removed successfully" });
  
    } catch (error) {
      console.error("Error in removeCategoryOffer:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };


  
const getListCategory=async(req,res)=>{
    try {
        ///accessing id from query params
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");
        
    } catch (error) {
        res.redirect("/pageerror")
        
    }
}

const getUnlistCategory=async(req,res)=>{
    try {
        ///accessing id from query params
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category");
        
    } catch (error) {
        res.redirect("/pageerror")
        
    }
}

const getEditCategory=async(req,res)=>{
    try {
        let id=req.query.id;
        const category=await Category.findOne({_id:id});
        res.render("edit-category",{category:category});
    } catch (error) {
        res.redirect("pageerror")
    }
};

const editCategory=async(req,res)=>{
    try {
        const id=req.params.id;
        const {categoryName,description}=req.body;
        const existingCategory=await Category.findOne({name:categoryName});

        if(existingCategory){
            return res.status(400).json({error:"Category exists,Please choose another name"})
        }
        const updateCategory=await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description,
        },{new:true});

        if(updateCategory){
            res.redirect("/admin/category");
        }else{
            res.status(404).json({error:"Category not found"})
        }
        
    } catch (error) {
        res.status(500).json({error:"Internal server error "})
        
    }
}

const deleteCategory = async(req,res)=>{
    const id = req.params.id;
    try {
        const category = await Category.findByIdAndUpdate({_id:id},{isDeleted:true},{new:true});
        if(!category){
            return res.status(404).json({message:'Category not Found'});
        }
        res.status(200).json({message:`${category} deleted successfully`})
    } catch (error) {
        res.status(500).json({message:'Error occured during Deleting Category',error:error.message});
    }
}


module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    deleteCategory,

};
