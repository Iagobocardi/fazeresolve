// src/routes/fornecedores.routes.js

const express = require('express');
const router = express.Router();
const fornecedorController = require('../controllers/fornecedor.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/checkPermission.middleware');

// Aplica o middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Rota para listar todos os fornecedores
// GET /api/fornecedores
router.get('/', checkPermission('ver_clientes'), fornecedorController.listarFornecedores);

// POST /api/fornecedores
router.post('/', checkPermission('editar_clientes'), fornecedorController.criarFornecedor);

module.exports = router;
