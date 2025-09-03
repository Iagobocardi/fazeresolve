// src/routes/fornecedores.routes.js

const express = require('express');
const router = express.Router();
const fornecedorController = require('../controllers/fornecedor.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['Dono', 'ADMIN']));

// Rota para listar todos os fornecedores
// GET /api/fornecedores
router.get('/', fornecedorController.listarFornecedores);

// POST /api/fornecedores
router.post('/', fornecedorController.criarFornecedor);

module.exports = router;
