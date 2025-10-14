const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamento.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const checkSubscription = require('../middlewares/checkSubscription.middleware.js');

// Rota para criar um pagamento único (PIX ou Cartão)
// Acessível a qualquer usuário logado, pois eles podem querer comprar acesso.
router.post('/criar-pagamento-unico', authMiddleware, pagamentoController.createOneTimePayment);

// Rota pública para receber webhooks de notificação do Mercado Pago
router.post('/mercado-pago-webhook', pagamentoController.handleWebhook);

module.exports = router;
