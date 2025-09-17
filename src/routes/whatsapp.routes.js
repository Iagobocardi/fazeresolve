// Em: src/routes/whatsapp.routes.js

const express = require('express');
const router = express.Router();

const whatsappController = require('../controllers/whatsapp.controller');
const checkPlan = require('../middlewares/checkPlan.middleware.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

// --- Rotas para Conexão WhatsApp via OAuth (META) ---
// O prestador precisa estar logado para iniciar a conexão.
router.get('/connect/meta', authMiddleware, whatsappController.connectMeta);

// O callback do provedor OAuth (Meta) não terá autenticação por token, é uma rota pública.
router.get('/callback/meta', whatsappController.handleMetaCallback);
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

// --- Nova Rota para Envio Rápido de Mensagem ---
router.post(
    '/send-message',
    authMiddleware,
    checkPlan(['Premium']), // Envio direto também deve ser um recurso Premium
    whatsappController.sendQuickMessage
);

module.exports = router;
