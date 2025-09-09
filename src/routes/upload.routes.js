/*
 * -----------------------------------------------------------------
 * FICHEIRO 3: Crie este ficheiro em 'src/routes/upload.routes.js'
 * -----------------------------------------------------------------
 * Descrição: Esta é a rota que o seu frontend irá chamar.
 * Ela usa o middleware 'upload' para processar um único ficheiro
 * com o nome de campo 'image' antes de chamar o controlador.
 */
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { multerMemoryUpload } = require('../middlewares/cloudinary.middleware.js'); // Usa o novo middleware de memória
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['Dono', 'ADMIN']));

// POST /api/upload/product-image
router.post(
    '/product-image',
    multerMemoryUpload.single('image'), // Usa o novo uploader de memória
    uploadController.uploadProductImage
);
router.post(
    '/invoice-image',
    multerMemoryUpload.single('invoice'), // Usa o novo uploader de memória
    uploadController.uploadInvoiceImage
);

// POST /api/upload/logo
router.post(
    '/logo',
    multerMemoryUpload.single('logo'), // Usa o novo uploader de memória
    uploadController.uploadLogo
);
// -------------------------------------


module.exports = router;
