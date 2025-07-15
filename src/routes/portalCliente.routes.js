// src/routes/portalCliente.routes.js

const express = require('express');
const router = express.Router();
const portalClienteController = require('../controllers/portalCliente.controller');
const authClienteMiddleware = require('../middlewares/authCliente.middleware.js');

// --- Rotas Públicas ---
router.post('/login', portalClienteController.login);
router.post('/ativar-conta', portalClienteController.ativarConta);

// --- Rotas Protegidas (Exigem Token) ---

// Busca a LISTA de pedidos do cliente logado
router.get('/pedidos', authClienteMiddleware, portalClienteController.getMeusPedidos);

// ===============================================
// ==> A ROTA QUE FALTAVA FOI ADICIONADA AQUI <==
// ===============================================
// Busca UM pedido específico pelo ID
router.get('/pedidos/:id', authClienteMiddleware, portalClienteController.getMeuPedidoPorId);

// Ações para um pedido específico
router.post('/pedidos/:id/aprovar', authClienteMiddleware, portalClienteController.aprovarPedido);
router.post('/pedidos/:id/rejeitar', authClienteMiddleware, portalClienteController.rejeitarPedido);

module.exports = router;