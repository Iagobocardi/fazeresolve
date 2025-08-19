const subscriptionService = require('../services/subscription.service.js');
// Importe o seu modelo de Cliente/Utilizador
const Cliente = require('../models/cliente.model.js');

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
        // O ID do utilizador é extraído do token pelo middleware
        const userId = req.user.id; 

        if (!planId || !cardTokenId) {
            return res.status(400).json({ error: 'O ID do plano e o token do cartão são obrigatórios.' });
        }

        // =======================================================
        // ==> A CORREÇÃO ESTÁ AQUI <==
        // Buscamos o utilizador completo na base de dados para garantir
        // que temos todos os dados necessários (como email e nome).
        // =======================================================
        const user = await Cliente.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }
        // -------------------------------------------------------

        // Agora passamos o objeto completo do utilizador para o serviço
        const subscription = await subscriptionService.createSubscription(planId, user, cardTokenId);

        res.status(201).json(subscription);
    } catch (error) {
        // Adicionamos um log mais detalhado para facilitar a depuração no futuro
        console.error('Erro detalhado no handleSubscribe:', error);
        res.status(500).json({ error: 'Erro ao criar a assinatura.' });
    }
};

module.exports = {
    handleCreatePlan,
    handleSubscribe,
};
