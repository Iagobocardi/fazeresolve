const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const path = require('path');

// Configura o Cloudinary com as credenciais do ambiente
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Filtro de ficheiros para aceitar imagens e PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de ficheiro não suportado. Apenas imagens (jpeg, jpg, png, gif) e PDF são permitidos.'), false);
  }
};

// Configuração do Multer para usar armazenamento em memória
const multerMemoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 } // Limite de 10MB
});

// Middleware para fazer upload do ficheiro para o Cloudinary
const uploadToCloudinary = (folder) => (req, res, next) => {
    if (!req.file) {
        return next(); // Se não houver ficheiro, continua para o próximo middleware
    }

    const stream = cloudinary.uploader.upload_stream(
        {
            folder: folder,
            resource_type: "auto" // Deixa o Cloudinary detetar o tipo de recurso
        },
        (error, result) => {
            if (error) {
                console.error('Erro no upload para o Cloudinary:', error);
                return next(error);
            }
            // Anexa o URL seguro ao objeto req.file para ser usado no controlador
            req.file.cloudinaryUrl = result.secure_url;
            next();
        }
    );

    // Envia o buffer do ficheiro para o stream do Cloudinary
    streamifier.createReadStream(req.file.buffer).pipe(stream);
};

module.exports = {
    multerMemoryUpload,
    uploadToCloudinary
};
