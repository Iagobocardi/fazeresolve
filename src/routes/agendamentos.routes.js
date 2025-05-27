const express = require('express');
const router = express.Router();
const agendamentosController = require('../controllers/agendamentos.controller');
const { agendamentoValidationRules } = require('../controllers/agendamentos.controller');
const { validate } = require('../middlewares/validation.middleware');

router.get('/', agendamentosController.getAllAgendamentos);
router.get('/:id', agendamentosController.getAgendamentoById);
router.post('/', agendamentoValidationRules, validate, agendamentosController.createAgendamento);
router.put('/:id', agendamentoValidationRules, validate, agendamentosController.updateAgendamento);
router.delete('/:id', agendamentosController.deleteAgendamento);

module.exports = router;