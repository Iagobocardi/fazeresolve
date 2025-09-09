// Em: src/middlewares/upload.middleware.js

const multer = require('multer');
const path = require('path');

// 1. Configuração de armazenamento (Storage Engine)
// Isto diz ao multer como e onde guardar os ficheiros.
const storage = multer.diskStorage({
  // Define a pasta de destino
  destination: function (req, file, cb) {
    // Usamos o caminho para a pasta que já existe no seu projeto.
    cb(null, 'public/uploads/');
  },
  // Define o nome do ficheiro para garantir que seja único
  filename: function (req, file, cb) {
    // Cria um nome de ficheiro único para evitar conflitos.
    // Ex: logo-1678886400000.png
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Filtro de ficheiros (Opcional, mas recomendado)
// Garante que apenas tipos de ficheiro permitidos (imagens e PDF) sejam aceites.
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de ficheiro não suportado. Apenas imagens (jpeg, jpg, png, gif) e PDF são permitidos.'), false);
  }
};

// 3. Cria e exporta o middleware do multer com as configurações
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // Limite de 5MB por ficheiro
});

module.exports = upload;
