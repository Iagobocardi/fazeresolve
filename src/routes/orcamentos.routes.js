// Arquivo: src/routes/orcamentos.routes.js

const express = require('express');
const router = express.Router();
const orcamentosController = require('../controllers/orcamentos.controller');
const { orcamentoValidationRules } = require('../controllers/orcamentos.controller');
const { validate } = require('../middlewares/validation.middleware');

// Rotas mais específicas primeiro
router.get('/recentes', orcamentosController.getRecentOrcamentos);

// Rotas genéricas depois
router.get('/', orcamentosController.getAllOrcamentos);
router.get('/:id', orcamentosController.getOrcamentoById);
router.post('/', orcamentoValidationRules(), validate, orcamentosController.createOrcamento);
router.put('/:id', orcamentoValidationRules(), validate, orcamentosController.updateOrcamento);
router.delete('/:id', orcamentosController.deleteOrcamento);

// ROTA para atualizar apenas o status
router.patch('/:id/status', orcamentosController.updateOrcamentoStatus);
router.patch('/:id/submit', orcamentosController.submitOrcamento);

module.exports = router;
