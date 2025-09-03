// Arquivo: src/routes/produtos.routes.js

const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtos.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['Dono', 'ADMIN']));

// Rotas para o CRUD de produtos
router.post('/', produtosController.createProduto);
router.get('/', produtosController.getAllProdutos);
router.put('/:id', produtosController.updateProduto);
router.delete('/:id', produtosController.deleteProduto);

// Rota específica para ajustar o estoque
router.patch('/:id/estoque', produtosController.ajustarEstoque);

module.exports = router;
