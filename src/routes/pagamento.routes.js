const express = require('express');
const router = express.Router();
const { createOneTimePayment, handleWebhook } = require('../controllers/pagamento.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

// Rota para criar um pagamento único (PIX ou Cartão)
router.post('/criar-pagamento-unico', authMiddleware, createOneTimePayment);

// Rota pública para receber webhooks de notificação do Mercado Pago
router.post('/mercado-pago-webhook', handleWebhook);

module.exports = router;
