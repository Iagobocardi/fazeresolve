const express = require('express');
const router = express.Router();
const agendamentosController = require('../controllers/agendamentos.controller');
const { agendamentoValidationRules } = require('../controllers/agendamentos.controller');
const { validate } = require('../middlewares/validation.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/checkPermission.middleware');

// Aplica o middleware de autenticação a todas as rotas
router.use(authMiddleware);

// As verificações de permissão são aplicadas individualmente a cada rota
router.get('/', checkPermission('ver_agenda'), agendamentosController.getAllAgendamentos);
router.get('/:id', checkPermission('ver_agenda'), agendamentosController.getAgendamentoById);
router.post('/', checkPermission('editar_agenda'), agendamentoValidationRules, validate, agendamentosController.createAgendamento);
router.put('/:id', checkPermission('editar_agenda'), agendamentoValidationRules, validate, agendamentosController.updateAgendamento);
router.delete('/:id', checkPermission('editar_agenda'), agendamentosController.deleteAgendamento);

// Rota para adicionar uma mensagem a um agendamento
router.post('/:id/mensagens', checkPermission('editar_agenda'), agendamentosController.enviarMensagem);

module.exports = router;
