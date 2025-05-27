const express = require('express');
const router = express.Router();
const orcamentosController = require('../controllers/orcamentos.controller');
const { orcamentoValidationRules } = require('../controllers/orcamentos.controller');
const { validate } = require('../middlewares/validation.middleware');

router.get('/', orcamentosController.getAllOrcamentos);
router.get('/:id', orcamentosController.getOrcamentoById);
router.post('/', orcamentoValidationRules, validate, orcamentosController.createOrcamento);
router.put('/:id', orcamentoValidationRules, validate, orcamentosController.updateOrcamento);
router.delete('/:id', orcamentosController.deleteOrcamento);

module.exports = router;