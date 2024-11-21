const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const productController = require('../controllers/admin/productController');
const categoryController = require('../controllers/admin/categoryController');
const { userAuth, adminAuth } = require('../middlewares/auth');
const multer = require('multer');
const storage = require('../helpers/multer');
const uploads = multer({ storage: storage });

// Login
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/', adminAuth, adminController.loadDashboard);
router.get('/pageerror', adminController.pageerror);
router.get('/logout', adminAuth, adminController.logout);

// Customer Management
router.get('/customers', adminAuth, customerController.customerInfo);
router.get('/blockCustomer/:id', adminAuth, customerController.customerBlocked);
router.get('/unblockCustomer/:id', adminAuth, customerController.customerunBlocked);

// Category Management
router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/category', adminAuth, categoryController.addCategory);
router.post('/addCategoryOffer', adminAuth, categoryController.addCategoryOffer);
router.post('/removeCategoryOffer', adminAuth, categoryController.removeCategoryOffer);
router.get('/listCategory', adminAuth, categoryController.getListCategory);
router.get('/unlistCategory', adminAuth, categoryController.getUnlistCategory);
router.get('/editCategory/:id', adminAuth, categoryController.getEditCategory);
router.post('/editCategory/:id', adminAuth, categoryController.editCategory);

// Product Management
router.get('/addProducts', adminAuth, productController.getProductAddPage);
router.post(
    '/addProducts',
    adminAuth,
    (req, res, next) => {
        uploads.array('images', 4)(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: 'File upload error: ' + err.message });
            } else if (err) {
                return res.status(500).json({ error: 'Unexpected error: ' + err.message });
            }
            next();
        });
    },
    productController.addProducts
);

module.exports = router;
