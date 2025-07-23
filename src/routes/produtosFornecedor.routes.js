// src/routes/produtosFornecedor.routes.js

const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoFornecedor.controller.js');

// Rota para listar produtos de UM fornecedor
// GET /api/fornecedores/:fornecedorId/produtos
router.get('/:fornecedorId/produtos', produtoController.listarProdutosPorFornecedor);

// Rota para CRIAR um novo produto para um fornecedor
// POST /api/fornecedores/:fornecedorId/produtos
router.post('/:fornecedorId/produtos', produtoController.criarProduto);

module.exports = router;