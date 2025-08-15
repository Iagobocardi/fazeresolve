const subscriptionService = require('../services/subscription.service.js');

/**
 * Controller para criar um novo plano de assinatura.
 * Acessível apenas para Admins.
 */
const handleCreatePlan = async (req, res) => {
    try {
        const { name, price } = req.body;
        if (!name || !price) {
            return res.status(400).json({ error: 'Nome e preço do plano são obrigatórios.' });
        }

        const planData = { name, price };
        const plan = await subscriptionService.createPlan(planData);

        res.status(201).json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar o plano de assinatura.' });
    }
};

/**
 * Controller para um prestador se inscrever em um plano.
 */
const handleSubscribe = async (req, res) => {
    try {
        const { planId, cardTokenId } = req.body;
        const user = req.user; // O usuário (prestador) é injetado pelo middleware de autenticação

        if (!planId || !cardTokenId) {
            return res.status(400).json({ error: 'O ID do plano e o token do cartão são obrigatórios.' });
        }

        const subscription = await subscriptionService.createSubscription(planId, user, cardTokenId);

        // A resposta agora é a própria assinatura criada
        res.status(201).json(subscription);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar a assinatura.' });
    }
};

module.exports = {
    handleCreatePlan,
    handleSubscribe,
};
