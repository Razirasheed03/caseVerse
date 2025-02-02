const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');



const getProductAddPage = async (req, res) => {
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
        const category = await Category.find({ isListed: true });
        // const brand = await Brand.find({isBlocked:false});
        res.render('product-add', {
            cat: category,
        })
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName: products.productName,
        });

        if (!productExists) {
            const images = [];

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);
                    await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }

            }

            const categoryId = await Category.findOne({ name: products.category });

            if (!categoryId) {
                return res.status(400).json({ message: 'Invalid category name' });
            }
            const newProduct = new Product({

                productName: products.productName,
                description: products.description,
                // brand:products.brands,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdOn: new Date(),
                quantity: products.quantity,
                // size: products.size,
                color: products.color,
                productImage: images,
                status: 'Available',
            });
            await newProduct.save();
            return res.status(200).json({ redirectTo: '/admin/addProducts?success=true' });///admin/addProducts?success=true
        } else {
            return res.status(400).json('Product already exists, Please try with another name');
        }
    } catch (error) {
        console.error('Error saving product', error);
        return res.status(500).json({ redirectTo: '/admin/pageerror' })
    }
}

const getAllProducts = async (req, res) => {
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
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;
        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } },
                // {brand:{$regex:new RegExp('.*'+search+'.*','i')}},
            ]
        }).limit(limit * 1).skip((page - 1) * limit).populate('category').exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp('.*' + search + '.*', 'i') } },
                // {brand:{$regex:new RegExp('.*'+search+'.*','i')}}
            ],
        }).countDocuments();
        const category = await Category.find({ isListed: true });
        // const brand = await Brand.find({isBlocked:false});
        if (category) {
            res.render('products', {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                // brand:brand
            })

        } else {
            res.render('page-404');
        }
    } catch (error) {
        res.redirect('/pageError')
    }
};

const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        const findProduct = await Product.findOne({ _id: productId });
        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: 'This product category already has a category offer' })
        }
        findProduct.salePrice = findProduct.salePrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();
        res.json({ status: true });
    } catch (error) {
        res.redirect('/pageError');
        res.status(500).json({ status: false, message: "Internal Server Error" });

    }
}

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body
        const findProduct = await Product.findOne({ _id: productId });
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({ status: true })

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pageerror")

    }
}
const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pageerror")

    }
}

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        res.render("edit-product", {
            product: product,
            cat: category,

        })

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: 'Product with this name already exists. Please try with another name' });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename); // Storing the file name
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: data.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color
        };

        if (req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } }; // Add images to the database
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        return res.status(200).json({ redirectTo: '/admin/products?success=true' });

    } catch (error) {
        console.log(error);
        res.redirect('/pageError');
    }
};


const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer, { $pull: { productImage: imageNameToServer } });
        const imagePath = path.join('public', 'uploads', 're-image', imageNameToServer);
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
        } else {
            console.log(`image ${imageNameToServer} not found`);
        }
        res.status(200).json({ success: true })
    } catch (error) {
        res.status(500).json({ redirect: '/pageError' })
    }
}

const deleteProduct = async (req, res) => {
    const id = req.params.id;
    try {
        const update = await Product.findByIdAndUpdate(
            { _id: id },
            { isDeleted: true },
            { new: true }
        );

        if (!update) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error occurred during deleting product',
            error: error.message
        });
    }
}

const stock = async (req, res) => {
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
        const products = await Product.find().populate('category', 'name');
        res.render('stock', { products })

    } catch (error) {


    }
}
const addstock = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        // Validate input
        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input: Ensure productId is provided and quantity is greater than 0.',
            });
        }


        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.',
            });
        }

        product.quantity += parseInt(quantity, 10);


        await product.save();

        res.status(200).json({
            success: true,
            message: 'Stock updated successfully.',
            updatedQuantity: product.quantity,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.',
        });
    }
};



module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    deleteProduct,
    stock,
    addstock,



}