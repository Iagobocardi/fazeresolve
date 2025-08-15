const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware.js');

// Proteger todas as rotas de assinatura com autenticação
router.use(authMiddleware);

// Rota para administradores criarem planos
router.post(
    '/plans',
    roleMiddleware(['ADMIN']),
    subscriptionController.handleCreatePlan
);

// Rota para prestadores se inscreverem em um plano
router.post(
    '/subscribe',
    roleMiddleware(['PRESTADOR']),
    subscriptionController.handleSubscribe
);

module.exports = router;
