// src/routes/fornecedores.routes.js

const express = require('express');
const router = express.Router();
const fornecedorController = require('../controllers/fornecedor.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/checkPermission.middleware');

// Aplica o middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Rota para listar todos os fornecedores (com filtros)
// GET /api/fornecedores
router.get('/', checkPermission('ver_fornecedores'), fornecedorController.listarFornecedores);

// Rota para buscar um fornecedor específico
// GET /api/fornecedores/:id
router.get('/:id', checkPermission('ver_fornecedores'), fornecedorController.obterFornecedor);

// Rota para criar um novo fornecedor
// POST /api/fornecedores
router.post('/', checkPermission('editar_fornecedores'), fornecedorController.criarFornecedor);

// Rota para atualizar um fornecedor
// PUT /api/fornecedores/:id
router.put('/:id', checkPermission('editar_fornecedores'), fornecedorController.atualizarFornecedor);

// Rota para desativar (deletar) um fornecedor
// DELETE /api/fornecedores/:id
router.delete('/:id', checkPermission('editar_fornecedores'), fornecedorController.deletarFornecedor);

module.exports = router;
