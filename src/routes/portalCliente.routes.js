const express = require('express');
const router = express.Router();
const portalClienteController = require('../controllers/portalCliente.controller'); // Precisaremos criar este controller
const authClienteMiddleware = require('../middlewares/authCliente.middleware.js'); // O nosso segurança

// Rota pública para o cliente fazer login
router.post('/login', portalClienteController.login);

// Só quem passar pelo segurança chega ao controller.
router.get('/pedidos', authClienteMiddleware, portalClienteController.getMeusPedidos);
// ==> NOVAS ROTAS DE AÇÃO <==
router.post('/pedidos/:id/aprovar', authClienteMiddleware, portalClienteController.aprovarPedido);
router.post('/pedidos/:id/rejeitar', authClienteMiddleware, portalClienteController.rejeitarPedido);

// NOVA ROTA pública para o cliente ativar a conta e definir a senha
router.post('/ativar-conta', portalClienteController.ativarConta);

module.exports = router;