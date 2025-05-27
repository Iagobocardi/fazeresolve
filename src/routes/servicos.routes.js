const express = require('express');
const router = express.Router();
const servicosController = require('../controllers/servicos.controller');
const { servicoValidationRules } = require('../controllers/servicos.controller');
const { validate } = require('../middlewares/validation.middleware');

router.get('/', servicosController.getAllServicos);
router.get('/:id', servicosController.getServicoById);
router.post('/', servicoValidationRules, validate, servicosController.createServico);
router.put('/:id', servicoValidationRules, validate, servicosController.updateServico);
router.delete('/:id', servicosController.deleteServico);

module.exports = router;