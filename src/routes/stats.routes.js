// Arquivo: src/routes/stats.routes.js
// Versão final e correta

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR', 'ADMIN']));

// Rota para os cards do dashboard
router.get('/dashboard', statsController.getDashboardStats);

// Rota para o gráfico de faturamento mensal
router.get('/faturamento-mensal', statsController.getFaturamentoMensal);

// Rota para o resumo da página financeira
router.get('/resumo-financeiro', statsController.getResumoFinanceiro);

// ✅ ROTA NOVA PARA O GRÁFICO FINANCEIRO
// =======================================================
router.get('/historico-financeiro', statsController.getHistoricoFinanceiro);

// ✅ ROTA NOVA PARA BUSCAR OS SERVIÇOS MAIS PEDIDOS
// =======================================================
router.get('/top-servicos', statsController.getTopServicos);

// ✅ ROTA NOVA PARA BUSCAR OS CLIENTES MAIS VALIOSOS
// =======================================================
router.get('/top-clientes', statsController.getTopClientes);

router.get('/demand-by-neighborhood', statsController.getDemandByNeighborhood);

module.exports = router;