// Arquivo: src/routes/whatsapp.routes.js
const express = require('express');
const router = express.Router();

// Importe o controller e as regras de validação e o middleware de validação
const whatsappController = require('../controllers/whatsapp.controller');
const { validate } = require('../middlewares/validation.middleware');

// Use as regras de validação e a função do controller importados
router.post(
    '/whatsapp-hook',
    whatsappController.whatsappMessageValidationRules, // Use as regras do controller
    validate,                                     // Aplique o middleware de validação
    whatsappController.receiveMessage                 // Chame a função do controller
);

module.exports = router;