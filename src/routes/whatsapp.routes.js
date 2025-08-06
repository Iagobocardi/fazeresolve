// Em: src/routes/whatsapp.routes.js

const express = require('express');
const router = express.Router(); // <-- Esta linha estava provavelmente em falta

const whatsappController = require('../controllers/whatsapp.controller');
const checkPlan = require('../middlewares/checkPlan.middleware.js'); // Importe o middleware

// A sua rota, agora com a verificação de plano
router.post(
    '/webhook',
    // Lembre-se que no futuro precisará de um middleware de autenticação aqui
    checkPlan(['Premium']), // Apenas utilizadores Premium podem usar a automação do webhook
    whatsappController.handleWhatsAppWebhook
);

module.exports = router;