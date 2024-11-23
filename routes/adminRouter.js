const express = require('express');
const router = express.Router();
const {userAtuth,adminAuth}=require('../middlewares/auth');

//Multer
const multer = require('multer');
const storage = require('../helpers/multer');
const uploads = multer({storage:storage});
//Controllers
const adminController = require('../controllers/admin/adminController');
const customerController= require('../controllers/admin/customerController');
const categoryController= require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');

//Admin Routes
router.get('/pageerror',adminController.pageerror)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout);

///User Management
router.get('/customers',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked);


//Category Management
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/category',adminAuth,categoryController.addCategory);
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer);
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)
router.get('/listCategory',adminAuth,categoryController.getListCategory);
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory);
router.get('/editCategory',adminAuth,categoryController.getEditCategory);
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)


//Product Management
router.get('/addProducts',adminAuth,productController.getProductAddPage);
router.post('/addProducts',adminAuth,uploads.array('images',4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)


module.exports=router;



