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


const { body } = require('express-validator');
const { validate } = require('../middlewares/validation.middleware');

// Regras de validação para o registo de prestador
const registerProviderRules = [
    body('nome').notEmpty().withMessage('O nome é obrigatório.').trim(),
    body('email').isEmail().withMessage('Por favor, forneça um email válido.').normalizeEmail(),
    body('telefone').notEmpty().withMessage('O telefone é obrigatório.').trim(),
    body('password').isLength({ min: 8 }).withMessage('A senha deve ter pelo menos 8 caracteres.'),
    body('plano').isIn(['Essencial', 'Profissional', 'Premium']).withMessage('O plano selecionado é inválido.')
];

// Rota para registrar um novo prestador de serviço, com validação
router.post('/register', registerProviderRules, validate, authController.registerProvider);

module.exports = router;