// Arquivo: src/routes/pagamento.routes.js
const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamento.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// POST /api/pagamentos/onetime - Cria um pagamento único (PIX ou Cartão)
router.post('/onetime', authMiddleware, pagamentoController.createOnetimePayment);

module.exports = router;
