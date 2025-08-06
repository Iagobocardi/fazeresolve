// src/routes/configuracao.routes.js

const express = require('express');
const router = express.Router();
const configuracaoController = require('../controllers/configuracao.controller.js');

// Rota para OBTER a configuração
// GET /api/configuracoes
router.get('/', configuracaoController.getConfiguracao);

// Rota para ATUALIZAR a configuração
// PUT /api/configuracoes
router.put('/', configuracaoController.updateConfiguracao);

// --- NOVAS ROTAS PARA A INTEGRAÇÃO ---
router.get('/google/connect', configuracaoController.connectGoogleCalendar);
router.get('/google/callback', configuracaoController.handleGoogleCallback);
router.delete('/google/disconnect', configuracaoController.disconnectGoogleCalendar);

module.exports = router;