const express = require('express');
const router = express.Router();
const mercadoPagoController = require('../controllers/mercadoPago.controller.js');

// Rota para receber notificações (webhooks) do Mercado Pago
router.post('/webhook', mercadoPagoController.handleWebhook);

module.exports = router;
