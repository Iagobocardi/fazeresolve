const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoque.controller');

// Rota para adicionar múltiplos itens ao estoque de uma só vez.
// POST /api/estoque/add-batch
router.post('/add-batch', estoqueController.addItemsInBatch);

// No futuro, pode adicionar outras rotas aqui, como:
// router.get('/', estoqueController.getAllItems);
// router.put('/:id', estoqueController.updateItem);

module.exports = router;
