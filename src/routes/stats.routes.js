// Arquivo: src/routes/stats.routes.js

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// REMOVEMOS os middlewares daqui. A segurança será aplicada no server.js

router.get('/dashboard', statsController.getDashboardStats);
router.get('/faturamento-mensal', statsController.getFaturamentoMensal);
router.get('/resumo-financeiro', statsController.getResumoFinanceiro);
router.get('/historico-financeiro', statsController.getHistoricoFinanceiro);
router.get('/top-servicos', statsController.getTopServicos);
router.get('/top-clientes', statsController.getTopClientes);
router.get('/demand-by-neighborhood', statsController.getDemandByNeighborhood);

module.exports = router;