const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portal.controller.js');

// Rota principal para obter o estado do pedido
router.get('/:token', portalController.getPedidoByToken);

// Rotas de ação do cliente
router.post('/:token/sugerir-visita', portalController.sugerirVisita);
router.post('/:token/aprovar-orcamento', portalController.aprovarOrcamento);
router.post('/:token/recusar-orcamento', portalController.recusarOrcamento);
router.post('/:token/informar-pagamento', portalController.informarPagamento);

module.exports = router;
