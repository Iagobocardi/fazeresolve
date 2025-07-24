// src/routes/checklist.routes.js
const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklist.controller.js');

// Adicionar tarefa a um pedido
router.post('/:pedidoId/checklist', checklistController.adicionarTarefa);

// Atualizar uma tarefa específica
router.patch('/:pedidoId/checklist/:tarefaId', checklistController.atualizarTarefa);

router.delete('/:pedidoId/checklist/:tarefaId', checklistController.removerTarefa);

module.exports = router;