// Em: src/routes/dashboard.routes.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller.js');

// REMOVEMOS os middlewares daqui. A segurança será aplicada no server.js

router.get('/', dashboardController.getDashboardData); 
router.get('/proximos-agendamentos', dashboardController.getProximosAgendamentos);
router.get('/pedidos-pendentes', dashboardController.getPedidosPendentes);
router.get('/pagamentos-atrasados', dashboardController.getPagamentosAtrasados);
router.get('/top-regioes', dashboardController.getTopRegioes);
router.get('/pedidos-coordenadas', dashboardController.getPedidosCoordenadas);
router.get('/top-servicos', dashboardController.getTopServicosPorCategoria);

module.exports = router;
