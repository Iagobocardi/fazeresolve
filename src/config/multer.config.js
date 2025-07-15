const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const hash = crypto.randomBytes(16).toString('hex');
        const filename = `${hash}-${file.originalname}`;
        cb(null, filename);
    }
});

const upload = multer({ storage: storage });

module.exports = upload;