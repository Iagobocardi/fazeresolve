// Arquivo: src/routes/orcamentos.routes.js

const express = require('express');
const router = express.Router();
const orcamentosController = require('../controllers/orcamentos.controller');
const { orcamentoValidationRules } = require('../controllers/orcamentos.controller');
const { validate } = require('../middlewares/validation.middleware');

// Rotas mais específicas primeiro
router.get('/recentes', orcamentosController.getRecentOrcamentos);
router.get('/avaliar/:id/:nota', orcamentosController.registrarAvaliacao);
router.get('/agendados', orcamentosController.getAgendamentosParaCalendario);

// ROTA para atualizar apenas o status
router.patch('/:id/status', orcamentosController.updateOrcamentoStatus);
router.patch('/:id/submit', orcamentosController.submitOrcamento);
router.patch('/:id/schedule', orcamentosController.scheduleOrcamento);
router.patch('/:id/notas', orcamentosController.updateNotasInternas);
router.patch('/:id/pagamento', orcamentosController.updateStatusPagamento);

// Rotas para as novas funcionalidades que criámos
router.patch('/:id/operacional', orcamentosController.updateDetalhesOperacionais);
router.post('/:id/custos', orcamentosController.addCustoMaterial);

// Rotas genéricas depois
router.get('/', orcamentosController.getAllOrcamentos);
router.get('/:id', orcamentosController.getOrcamentoById);
router.post('/', orcamentoValidationRules(), validate, orcamentosController.createOrcamento);
router.put('/:id', orcamentoValidationRules(), validate, orcamentosController.updateOrcamento);
router.delete('/:id', orcamentosController.deleteOrcamento)
router.patch('/:id/notas', orcamentosController.updateNotasInternas);
router.post('/:orcamentoId/materiais', orcamentosController.adicionarMaterialAoPedido);


module.exports = router;
