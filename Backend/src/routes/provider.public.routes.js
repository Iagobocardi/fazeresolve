// src/routes/provider.public.routes.js
const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller.js');

// Rota PÚBLICA para o callback do Mercado Pago OAuth
router.get('/mercadopago-callback', providerController.handleMercadoPagoCallback);

module.exports = router;
