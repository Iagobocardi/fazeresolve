// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');

// Rota de login padrão com email ou telefone
router.post('/login', authController.loginCliente);

// Rotas para o fluxo de autenticação com o Google
// O utilizador precisa de estar logado para associar a sua conta Google
router.get('/google', authMiddleware, authController.iniciarAuthGoogle);

// Rota de callback que o Google chama após o consentimento do utilizador
router.get('/google/callback', authController.handleGoogleCallback);


module.exports = router;