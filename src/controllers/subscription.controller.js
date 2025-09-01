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
const Conta = require('../models/conta.model');

const handleSubscribe = async (req, res) => {
    try {
        const { cardTokenId, deviceId } = req.body;
        const usuario = req.user; // O middleware já nos dá o objeto Usuario completo.

        if (!cardTokenId) {
            return res.status(400).json({ message: 'O token do cartão é obrigatório.' });
        }

        // 1. Busca a conta associada ao usuário
        const conta = await Conta.findById(usuario.contaId);
        if (!conta) {
            return res.status(404).json({ message: 'Conta associada não encontrada.' });
        }

        if (conta.statusAssinatura !== 'AGUARDANDO_PAGAMENTO') {
            return res.status(400).json({ message: 'Esta conta não está aguardando pagamento.' });
        }

        console.log(`[Subscribe] Iniciando criação de assinatura para conta ${conta._id} com plano ${conta.planId}`);
        const subscription = await subscriptionService.createSubscription(conta.planId, usuario, cardTokenId, deviceId);
        console.log(`[Subscribe] Assinatura criada com sucesso no Mercado Pago com ID: ${subscription.id}`);

        // 2. Atualiza o status da CONTA e armazena o ID da assinatura
        conta.statusAssinatura = 'ATIVO';
        conta.mercadoPagoSubscriptionId = subscription.id;
        await conta.save();
        console.log(`[Subscribe] Conta ${conta._id} atualizada para ATIVO.`);

        // 3. Gera um novo token JWT definitivo para o USUÁRIO
        const payload = { id: usuario._id }; // Payload minimalista
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        const userToReturn = usuario.toObject();
        delete userToReturn.password;

        res.status(201).json({
            message: 'Assinatura criada com sucesso!',
            token,
            usuario: userToReturn,
            conta: conta
        });

    } catch (error) {
        console.error('Erro detalhado no handleSubscribe:', error);
        res.status(500).json({ message: 'Não foi possível processar sua assinatura.', details: error.message });
    }
};

module.exports = {
    handleCreatePlan,
    handleSubscribe,
};
