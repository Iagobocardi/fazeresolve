// Em: src/routes/whatsapp.routes.js

const express = require('express');
const router = express.Router();

const whatsappController = require('../controllers/whatsapp.controller');
const checkPlan = require('../middlewares/checkPlan.middleware.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

// --- Novas Rotas para Conexão WhatsApp OAuth ---
// O prestador precisa estar logado para iniciar a conexão.
router.get('/connect', authMiddleware, whatsappController.connectWhatsapp);

// O callback do provedor OAuth não terá autenticação por token, é uma rota pública.
router.get('/callback', whatsappController.handleWhatsappCallback);
// ---------------------------------------------

// Rota do Webhook (automação) - DEVE SER PÚBLICA
// A lógica para verificar o plano Premium deve estar DENTRO do handleWhatsAppWebhook
router.post(
    '/webhook',
    whatsappController.handleWhatsAppWebhook
);

// --- Rotas para Templates de Mensagem (estas estão corretas) ---

// Rota para renderizar um template com dados de um orçamento
router.get(
    '/templates/render/:templateId/:orcamentoId',
    authMiddleware,
    whatsappController.renderTemplate
);

// Rota para listar todos os templates
router.get(
    '/templates',
    authMiddleware,
    whatsappController.getAllTemplates
);

// Rota para criar um novo template (Apenas Admin)
router.post(
    '/templates',
    authMiddleware,
    checkPlan(['Admin', 'Premium']), // Permitir que Premium também crie templates, se desejar
    whatsappController.createTemplate
);

// Rota para atualizar um template (Apenas Admin)
router.put(
    '/templates/:id',
    authMiddleware,
    checkPlan(['Admin', 'Premium']),
    whatsappController.updateTemplate
);

// Rota para deletar um template (Apenas Admin)
router.delete(
    '/templates/:id',
    authMiddleware,
    checkPlan(['Admin', 'Premium']),
    whatsappController.deleteTemplate
);

// --- Nova Rota para Agendamento ---
router.post(
    '/schedule-message',
    authMiddleware,
    checkPlan(['Premium']), // Apenas para planos Premium
    whatsappController.scheduleMessage
);

module.exports = router;
