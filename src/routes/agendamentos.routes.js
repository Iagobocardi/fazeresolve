const express = require('express');
const router = express.Router();
const agendamentosController = require('../controllers/agendamentos.controller');
const { agendamentoValidationRules } = require('../controllers/agendamentos.controller');
const { validate } = require('../middlewares/validation.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR', 'ADMIN']));

router.get('/', agendamentosController.getAllAgendamentos);
router.get('/:id', agendamentosController.getAgendamentoById);
router.post('/', agendamentoValidationRules, validate, agendamentosController.createAgendamento);
router.put('/:id', agendamentoValidationRules, validate, agendamentosController.updateAgendamento);
router.delete('/:id', agendamentosController.deleteAgendamento);

module.exports = router;