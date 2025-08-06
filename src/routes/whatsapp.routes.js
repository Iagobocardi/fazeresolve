// Em: src/routes/whatsapp.routes.js

const express = require('express');
const router = express.Router();

const whatsappController = require('../controllers/whatsapp.controller');
const checkPlan = require('../middlewares/checkPlan.middleware.js');
const authMiddleware = require('../middlewares/auth.middleware.js'); // Vamos precisar de autenticação

// Rota do Webhook (automação) - Acesso Premium
router.post(
    '/webhook',
    checkPlan(['Premium']), // Apenas utilizadores Premium podem usar a automação do webhook
    whatsappController.handleWhatsAppWebhook
);

// --- Novas Rotas para Templates de Mensagem ---

// Rota para renderizar um template com dados de um orçamento
// Acessível a todos os utilizadores autenticados
router.get(
    '/templates/render/:templateId/:orcamentoId',
    authMiddleware, // Garante que o utilizador está logado
    whatsappController.renderTemplate
);

// Rota para listar todos os templates
// Acessível a todos os utilizadores autenticados
router.get(
    '/templates',
    authMiddleware,
    whatsappController.getAllTemplates
);

// Rota para criar um novo template
// Acessível apenas para Admins
router.post(
    '/templates',
    authMiddleware,
    checkPlan(['Admin']),
    whatsappController.createTemplate
);

// Rota para atualizar um template
// Acessível apenas para Admins
router.put(
    '/templates/:id',
    authMiddleware,
    checkPlan(['Admin']),
    whatsappController.updateTemplate
);

// Rota para deletar um template
// Acessível apenas para Admins
router.delete(
    '/templates/:id',
    authMiddleware,
    checkPlan(['Admin']),
    whatsappController.deleteTemplate
);

module.exports = router;