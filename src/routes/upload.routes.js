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
const uploadMiddleware = require('../middlewares/upload.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR', 'ADMIN']));

// POST /api/upload/product-image
router.post(
    '/product-image',
    uploadMiddleware.single('image'), // 'image' deve ser o nome do campo no FormData do frontend
    uploadController.uploadProductImage
);
router.post(
    '/invoice-image',
    uploadMiddleware.single('invoice'), // O nome do campo será 'invoice'
    uploadController.uploadInvoiceImage
);
// --- ADICIONE ESTA NOVA ROTA AQUI ---
// POST /api/upload/logo
router.post(
    '/logo',
    uploadMiddleware.single('logo'), // Espera um arquivo com a chave 'logo'
    uploadController.uploadLogo      // Chama a nova função no controlador que vamos criar
);
// -------------------------------------


module.exports = router;