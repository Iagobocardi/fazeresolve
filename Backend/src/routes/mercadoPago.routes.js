const express = require('express');
const router = express.Router();
const mercadoPagoController = require('../controllers/mercadoPago.controller.js');
const { validateWebhookSignature } = require('../middlewares/mercadoPago.middleware.js');

// Rota para receber notificações (webhooks) do Mercado Pago
// A assinatura é validada pelo middleware antes de chegar ao controller.
router.post('/webhook', validateWebhookSignature, mercadoPagoController.handleWebhook);

module.exports = router;
