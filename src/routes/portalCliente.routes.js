const express = require('express');
const router = express.Router();
const portalClienteController = require('../controllers/portalCliente.controller'); // Precisaremos criar este controller
const authClienteMiddleware = require('../middlewares/authCliente.middleware.js'); // O nosso segurança

// --- Rotas do Portal do Cliente ---

// Rota pública para o cliente fazer login
router.post('/login', portalClienteController.login);

// Rota PROTEGIDA para o cliente buscar os seus próprios pedidos
// Note o uso do middleware "authClienteMiddleware" antes do controller.
// Só quem passar pelo segurança chega ao controller.
router.get('/pedidos', authClienteMiddleware, portalClienteController.getMeusPedidos);

module.exports = router;