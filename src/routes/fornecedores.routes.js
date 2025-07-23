// src/routes/fornecedores.routes.js

const express = require('express');
const router = express.Router();
const fornecedorController = require('../controllers/fornecedor.controller.js');

// Rota para listar todos os fornecedores
// GET /api/fornecedores
router.get('/', fornecedorController.listarFornecedores);

// POST /api/fornecedores
router.post('/', fornecedorController.criarFornecedor);

module.exports = router;