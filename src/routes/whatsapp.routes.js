const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');

// Rota correta: /api/whatsapp/webhook
router.post('/webhook', whatsappController.handleWhatsAppWebhook);

module.exports = router;
