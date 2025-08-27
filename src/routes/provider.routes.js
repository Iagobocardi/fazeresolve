const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware.js');

// Todas as rotas neste arquivo exigem que o usuário esteja autenticado como PRESTADOR
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR']));

// Rota para atualizar as configurações de pagamento (método manual/pix)
router.put('/payment-settings', providerController.updatePaymentSettings);

// Futuramente, podemos adicionar a rota para conectar com o Mercado Pago aqui
// router.post('/connect-mercadopago', providerController.connectMercadoPago);

module.exports = router;
