const express = require('express');
const router = express.Router();
const membroController = require('../controllers/membro.controller.js');
const checkUserLimit = require('../middlewares/checkUserLimit.middleware.js');
const authMiddleware = require('../middlewares/auth.middleware.js'); // O seu middleware de autenticação

// Protege a rota de criação com a autenticação e a verificação de limite
router.post('/', authMiddleware, checkUserLimit, membroController.criarMembro);

// ... outras rotas (listar membros, apagar, etc.)

module.exports = router;