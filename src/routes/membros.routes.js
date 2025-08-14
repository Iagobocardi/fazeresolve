const express = require('express');
const router = express.Router();
const membroController = require('../controllers/membro.controller.js');
const checkUserLimit = require('../middlewares/checkUserLimit.middleware.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR', 'ADMIN']));

// Protege a rota de criação com a verificação de limite (autenticação e função já aplicadas acima)
router.post('/', checkUserLimit, membroController.criarMembro);

// ... outras rotas (listar membros, apagar, etc.)

module.exports = router;