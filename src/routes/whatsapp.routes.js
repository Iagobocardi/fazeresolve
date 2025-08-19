// Em: src/routes/whatsapp.routes.js

const express = require('express');
const router = express.Router();

const whatsappController = require('../controllers/whatsapp.controller');
const checkPlan = require('../middlewares/checkPlan.middleware.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

// Rota do Webhook (automação) - DEVE SER PÚBLICA
// A lógica para verificar o plano Premium deve estar DENTRO do handleWhatsAppWebhook
router.post(
    '/webhook',
    whatsappController.handleWhatsAppWebhook
);

// As rotas de templates foram movidas para o arquivo whatsappTemplates.routes.js

module.exports = router;
