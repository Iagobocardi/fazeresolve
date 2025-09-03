const express = require('express');
const router = express.Router();
const membroController = require('../controllers/membro.controller.js');
const checkUserLimit = require('../middlewares/checkUserLimit.middleware.js');
const checkSubscription = require('../middlewares/checkSubscription.middleware.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const checkPermission = require('../middlewares/checkPermission.middleware.js');

// Aplica o middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Protege a rota de criação com uma permissão de alto nível
// Usamos 'ver_financeiro' como proxy para "gerir membros"
router.post('/', checkPermission('ver_financeiro'), checkSubscription, checkUserLimit, membroController.criarMembro);

// ... outras rotas (listar membros, apagar, etc.)

module.exports = router;
