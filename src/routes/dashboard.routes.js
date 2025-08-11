// Em: src/routes/dashboard.routes.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR']));

// Rota para os dados da visão geral (já estava correta)
router.get('/', dashboardController.getDashboardData); 

// Rota para os próximos agendamentos (agora mais limpa)
router.get('/proximos-agendamentos', dashboardController.getProximosAgendamentos);
router.get('/pedidos-pendentes', dashboardController.getPedidosPendentes);
router.get('/pagamentos-atrasados', dashboardController.getPagamentosAtrasados);
router.get('/top-regioes', dashboardController.getTopRegioes);
router.get('/pedidos-coordenadas', dashboardController.getPedidosCoordenadas);
module.exports = router;