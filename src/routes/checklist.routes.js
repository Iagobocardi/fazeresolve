// Em: src/routes/checklist.routes.js

const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklist.controller.js');

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