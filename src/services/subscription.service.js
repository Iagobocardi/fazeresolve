const jwt = require('jsonwebtoken');
const subscriptionService = require('../services/subscription.service.js');
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
        const { cardTokenId } = req.body;
        const deviceId = req.header('X-meli-session-id');
        const userId = req.user.id;

        if (!cardTokenId) {
            return res.status(400).json({ error: 'O token do cartão é obrigatório.' });
        }

        const user = await Cliente.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        if (user.status !== 'AGUARDANDO_PAGAMENTO') {
            return res.status(400).json({ error: 'Este utilizador não está aguardando pagamento.' });
        }

        const subscription = await subscriptionService.createSubscription(user.planId, user, cardTokenId, deviceId);

        // Atualiza o status do usuário e armazena o ID da assinatura
        user.status = 'ATIVO';
        user.mercadoPagoSubscriptionId = subscription.id;
        await user.save();

        // Gera um novo token JWT definitivo
        const payload = {
            id: user._id,
            nome: user.nome,
            email: user.email,
            role: user.role,
            status: user.status
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        const userToReturn = user.toObject();
        delete userToReturn.password;

        res.status(201).json({
            message: 'Assinatura criada com sucesso!',
            token,
            usuario: userToReturn
        });

    } catch (error) {
        console.error('Erro detalhado no handleSubscribe:', error);
        res.status(400).json({ error: 'Erro ao criar a assinatura.', details: error.message });
    }
};

module.exports = {
    handleCreatePlan,
    handleSubscribe,
};
