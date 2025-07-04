// Arquivo: src/routes/produtos.routes.js

const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtos.controller');

// Rotas para o CRUD de produtos
router.post('/', produtosController.createProduto);
router.get('/', produtosController.getAllProdutos);
router.put('/:id', produtosController.updateProduto);
router.delete('/:id', produtosController.deleteProduto);

// Rota específica para ajustar o estoque
router.patch('/:id/estoque', produtosController.ajustarEstoque);

module.exports = router;