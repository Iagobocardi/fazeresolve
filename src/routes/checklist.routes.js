// Em: src/routes/checklist.routes.js

const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklist.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR', 'ADMIN']));

// Adicionar uma nova tarefa a um pedido
// Rota Final: POST /api/checklist/:pedidoId/tarefas
router.post('/:pedidoId/tarefas', checklistController.adicionarTarefa);

// Atualizar o estado de uma tarefa (concluída/não concluída)
// Rota Final: PATCH /api/checklist/:pedidoId/tarefas/:tarefaId
router.patch('/:pedidoId/tarefas/:tarefaId', checklistController.atualizarTarefa);

// Remover uma tarefa específica
// Rota Final: DELETE /api/checklist/:pedidoId/tarefas/:tarefaId
router.delete('/:pedidoId/tarefas/:tarefaId', checklistController.removerTarefa);

module.exports = router;