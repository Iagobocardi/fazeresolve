// Arquivo: src/routes/stats.routes.js
// Versão final e correta

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// Rota para os cards do dashboard
router.get('/dashboard', statsController.getDashboardStats);

// Rota para o gráfico de faturamento mensal
router.get('/faturamento-mensal', statsController.getFaturamentoMensal);

// Rota para o resumo da página financeira
router.get('/resumo-financeiro', statsController.getResumoFinanceiro);

module.exports = router;