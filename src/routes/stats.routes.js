// Arquivo: src/routes/stats.routes.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// Rota para obter as estatísticas do dashboard
router.get('/dashboard', statsController.getDashboardStats);
router.get('/faturamento-mensal', statsController.getFaturamentoMensal);
module.exports = router;