// Arquivo: src/routes/despesas.routes.js

const express = require('express');
const router = express.Router();
const despesasController = require('../controllers/despesas.controller');

// Rota para criar uma nova despesa
router.post('/', despesasController.createDespesa);

// Rota para obter todas as despesas
router.get('/', despesasController.getAllDespesas);

// Rota para obter uma despesa específica
router.get('/:id', despesasController.getDespesaById);

// Rota para atualizar uma despesa
router.put('/:id', despesasController.updateDespesa);

// Rota para deletar uma despesa
router.delete('/:id', despesasController.deleteDespesa);

module.exports = router;