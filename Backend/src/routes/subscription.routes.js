const express = require('express');
const router = express.Router();
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

// Rota para prestadores se inscreverem em um plano
router.post(
    '/subscribe',
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

// Rota para o usuário atualizar seu método de pagamento (v1.1)
router.post(
    '/update-payment-method',
    authMiddleware,
    roleMiddleware(['Dono']),
    subscriptionController.handleUpdatePaymentMethod
);

module.exports = router;
