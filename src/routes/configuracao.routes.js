// src/routes/configuracao.routes.js

const express = require('express');
const router = express.Router();
const configuracaoController = require('../controllers/configuracao.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const needsAuth = [authMiddleware, roleMiddleware(['Dono', 'ADMIN'])];

// Rota para OBTER a configuração
// GET /api/configuracoes
router.get('/', needsAuth, configuracaoController.getConfiguracao);

// Rota para ATUALIZAR a configuração
// PUT /api/configuracoes
router.put('/', needsAuth, configuracaoController.updateConfiguracao);

// --- NOVAS ROTAS PARA A INTEGRAÇÃO ---
router.get('/google/connect', needsAuth, configuracaoController.connectGoogleCalendar);
router.get('/google/callback', configuracaoController.handleGoogleCallback); // Esta rota não deve ter autenticação
router.delete('/google/disconnect', needsAuth, configuracaoController.disconnectGoogleCalendar);

// Rota para iniciar o onboarding do WhatsApp (placeholder)
router.get('/whatsapp/iniciar-onboarding', authMiddleware, configuracaoController.iniciarWhatsappOnboarding);

module.exports = router;
