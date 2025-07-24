// src/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.js');

// Rota para o login de clientes (já existente)
router.post('/login', authController.loginCliente);

// Rota que inicia o processo de login com a Google
router.get('/google', authController.iniciarAuthGoogle);

// Rota de callback para onde a Google redireciona após o consentimento
router.get('/google/callback', authController.handleGoogleCallback);

module.exports = router;