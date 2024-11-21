const multer=require('multer')
const path=require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'public', 'uploads', 'product-images')); // Path where the files stored
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Naming files with a timestamp to avoid overwriting
    }
  });
  
  // Create upload instance with the storage configuration
//   const uploads = multer({
//     storage: storage,
//     limits: { fileSize: 10 * 1024 * 1024 }  // 10MB file size limit
//   });
  
//   module.exports = uploads