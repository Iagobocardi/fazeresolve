// Ficheiro: src/routes/portalCliente.routes.js (VERSÃO CORRIGIDA E FINAL)

const express = require('express');
const router = express.Router();

// 1. Importa o controller e o middleware UMA VEZ com nomes consistentes.
const portalClienteController = require('../controllers/portalCliente.controller.js');
const authCliente = require('../middlewares/authCliente.middleware.js');

// --- Rotas Públicas ---
router.post('/login-token', portalClienteController.loginComToken);

// --- Rotas Protegidas (exigem que o cliente esteja logado) ---

// 2. Mantém as suas rotas GET consistentes (usando /pedidos)
router.get('/pedidos', authCliente, portalClienteController.getMeusPedidos);
router.get('/pedidos/:id', authCliente, portalClienteController.getMeuPedidoPorId);

// 3. Centraliza TODAS as ações de um pedido (aprovar, rejeitar, etc.)
//    numa única rota base para consistência. A rota de aprovação agora
//    chama a ÚNICA função correta: `aprovarOrcamento`.
router.post('/pedidos/:id/aprovar', authCliente, portalClienteController.aprovarOrcamento);
router.post('/pedidos/:id/rejeitar', authCliente, portalClienteController.rejeitarPedido);
router.post('/pedidos/:id/sugerir-agendamento', authCliente, portalClienteController.sugerirAgendamento);


module.exports = router;