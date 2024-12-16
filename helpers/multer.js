const { fileLoader } = require('ejs');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Path where the files are stored
        const uploadPath = path.join(__dirname, "../public/uploads/re-Images");
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Naming files with a timestamp and original file extension
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '.png'; // Preserve original extension, default to .png
        cb(null, `${timestamp}${ext}`);
    }
});

module.exports = storage;
