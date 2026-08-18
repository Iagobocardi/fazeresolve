const express = require('express');
const router = express.Router();
const notificacaoController = require('../controllers/notificacao.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const checkSubscription = require('../middlewares/checkSubscription.middleware.js');

// Middleware de autenticação e verificação de assinatura para todas as rotas de notificação
const needsAuth = [authMiddleware, checkSubscription];

// Rota para OBTER todas as notificações não lidas
// GET /api/notificacoes
router.get('/', needsAuth, notificacaoController.getNotificacoes);

// Rota para MARCAR uma notificação como lida
// POST /api/notificacoes/:id/marcar-como-lida
router.post('/:id/marcar-como-lida', needsAuth, notificacaoController.marcarComoLida);

module.exports = router;
