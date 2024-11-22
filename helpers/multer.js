const { fileLoader } = require('ejs');
const multer=require('multer')
const path=require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname,"../public/uploads/re-Images")); // Path where the files stored
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() +'-'+fileLoader.originalname+'.png'); // Naming files with a timestamp to avoid overwriting
    }
  });
  
  module.exports = storage;