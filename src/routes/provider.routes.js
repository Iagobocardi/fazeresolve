const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware.js');

// Rota PÚBLICA para o callback do Mercado Pago OAuth
router.get('/mercadopago-callback', providerController.handleMercadoPagoCallback);

// Todas as rotas abaixo exigem que o usuário esteja autenticado como PRESTADOR
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR']));

// Rota para buscar as configurações de pagamento do prestador
router.get('/payment-settings', providerController.getPaymentSettings);

// Rota para atualizar as configurações de pagamento (método manual/pix)
router.put('/payment-settings', providerController.updatePaymentSettings);

// Rota para iniciar o fluxo de conexão com o Mercado Pago
router.post('/connect-mercadopago', providerController.connectMercadoPago);

module.exports = router;
