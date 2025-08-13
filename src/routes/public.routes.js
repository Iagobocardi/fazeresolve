// src/routes/public.routes.js

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Rota para obter o status de um pedido (já existente)
router.get('/pedidos/:publicId', publicController.getPedidoByPublicId);

// --- NOVAS ROTAS ADICIONADAS ---

// Rota para APROVAR um orçamento
router.post('/pedidos/:publicId/aprovar', publicController.aprovarOrcamentoPublico);

// Rota para REJEITAR um orçamento
router.post('/pedidos/:publicId/rejeitar', publicController.rejeitarOrcamentoPublico);

// Rota para SUGERIR/REAGENDAR um agendamento
router.patch('/pedidos/:publicId/sugerir-agendamento', publicController.sugerirAgendamentoPublico);

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
router.post('/register', registerProviderRules, validate, publicController.registerProvider);

// Rota para o login social com o Google
router.post('/google-login', publicController.googleLogin);


module.exports = router;
