const express = require('express');
const router = express.Router();
const cors = require('cors');
const { corsOptions } = require('../config/cors.config.js');
const subscriptionController = require('../controllers/subscription.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware.js');
const provisionalAuthMiddleware = require('../middlewares/provisionalAuth.middleware.js');

// Rota para administradores criarem planos
router.post(
    '/plans',
    authMiddleware,
    roleMiddleware(['ADMIN']),
    subscriptionController.handleCreatePlan
);

// Habilita o CORS para a rota de subscrição
router.options('/subscribe', cors(corsOptions)); // Trata a requisição preflight
router.post(
    '/subscribe',
    cors(corsOptions), // Garante que a rota POST também tenha os cabeçalhos CORS
    provisionalAuthMiddleware,
    subscriptionController.handleSubscribe
);

// Rota para cancelar uma assinatura
router.post(
    '/cancel',
    authMiddleware,
    roleMiddleware(['Dono']),
    subscriptionController.cancelSubscription
);

// Rota para upgrade de plano
router.post(
    '/upgrade',
    authMiddleware,
    roleMiddleware(['Dono']),
    subscriptionController.handleUpgradePlan
);

// Rota para buscar os detalhes da conta do usuário (v1.1)
router.get(
    '/minha-conta',
    authMiddleware,
    roleMiddleware(['Dono']),
    subscriptionController.handleGetSubscriptionDetails
);

// Rota para o usuário regularizar um pagamento pendente (v1.1)
router.post(
    '/regularizar',
    authMiddleware,
    roleMiddleware(['Dono']),
    subscriptionController.handleRegularizePayment
);

// Rota para criar uma cobrança PIX para assinatura
router.post(
    '/pix',
    provisionalAuthMiddleware, // Usamos o auth provisório pois o usuário pode não ter assinatura ativa ainda
    subscriptionController.handleCreatePixPayment
);

module.exports = router;
