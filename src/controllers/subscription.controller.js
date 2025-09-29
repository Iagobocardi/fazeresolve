const jwt = require('jsonwebtoken');
const subscriptionService = require('../services/subscription.service.js');
const Cliente = require('../models/cliente.model.js');
const Usuario = require('../models/usuario.model.js');

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
        const usuario = req.user;

        if (!cardTokenId) {
            return res.status(400).json({ message: 'O token do cartão é obrigatório.' });
        }

        const conta = await Conta.findById(usuario.contaId);
        if (!conta) {
            return res.status(404).json({ message: 'Conta associada não encontrada.' });
        }

        if (conta.statusAssinatura !== 'AGUARDANDO_PAGAMENTO') {
            return res.status(400).json({ message: 'Esta conta não está aguardando pagamento.' });
        }

        console.log(`[Subscribe] Iniciando criação de assinatura para conta ${conta._id} com plano ${conta.planId}`);
        const subscriptionResult = await subscriptionService.createSubscription(conta.planId, usuario, cardTokenId, deviceId);

        // --- FLUXO HÍBRIDO: SÍNCRONO PARA SUCESSO, ASSÍNCRONO PARA PENDÊNCIAS ---

        // CASO 1: SUCESSO IMEDIATO
        if (subscriptionResult.status === 'authorized') {
            console.log(`[Subscribe] Assinatura autorizada com sucesso no MP. ID: ${subscriptionResult.id}`);

            conta.statusAssinatura = 'ATIVO';
            conta.mercadoPagoSubscriptionId = subscriptionResult.id;
            await conta.save();
            console.log(`[Subscribe] Conta ${conta._id} atualizada para ATIVO.`);

            const payload = { id: usuario._id, contaId: conta._id, role: usuario.role };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
            const finalUser = await Usuario.findById(usuario._id).select('-senha');

            return res.status(201).json({
                message: 'Assinatura criada com sucesso!',
                token,
                userType: 'provider',
                usuario: {
                    id: finalUser._id,
                    nome: finalUser.nome,
                    email: finalUser.email,
                    role: finalUser.role,
                    plano: conta.plano,
                    statusAssinatura: conta.statusAssinatura,
                    permissoes: finalUser.permissoes
                },
                conta: conta
            });
        }
        
        // CASO 2: FALHA IMEDIATA
        if (subscriptionResult.error || !['authorized', 'pending'].includes(subscriptionResult.status)) {
            console.warn(`[Subscribe] Falha na criação da assinatura para conta ${conta._id}. Status: ${subscriptionResult.status || 'N/A'}`);
            const errorMessage = subscriptionResult.message || 'O pagamento foi recusado. Por favor, verifique os dados do cartão ou tente outro.';
            return res.status(402).json({
                message: errorMessage,
                details: subscriptionResult
            });
        }

        // CASO 3: PENDENTE (fallback para webhook)
        console.log(`[Subscribe] Assinatura com status pendente (${subscriptionResult.status}). Aguardando webhook. ID: ${subscriptionResult.id}`);
        conta.mercadoPagoSubscriptionId = subscriptionResult.id;
        await conta.save();
        
        return res.status(200).json({
            message: 'Seu pagamento está pendente de aprovação. Avisaremos assim que for confirmado e seu acesso será liberado.'
        });

    } catch (error) {
        console.error('Erro inesperado no servidor durante o processo de assinatura:', error);
        res.status(500).json({
            message: 'Ocorreu um erro interno no servidor. Nossa equipe já foi notificada.',
            details: error.message
        });
    }
};

const handleUpgradePlan = async (req, res) => {
    try {
        const { newPlanName } = req.body; // 'Profissional' ou 'Premium'
        const { contaId } = req.user;

        if (!newPlanName) {
            return res.status(400).json({ message: 'O nome do novo plano é obrigatório.' });
        }

        const result = await subscriptionService.upgradeSubscription(contaId, newPlanName);

        res.status(200).json({
            message: 'Plano atualizado com sucesso!',
            ...result
        });

    } catch (error) {
        console.error("Erro ao fazer upgrade do plano:", error);
        res.status(500).json({ message: error.message || 'Erro interno ao atualizar o plano.' });
    }
};

const handleCancelSubscription = async (req, res) => {
    try {
        const { contaId } = req.user;
        await subscriptionService.cancelSubscription(contaId);
        res.status(200).json({ message: 'Assinatura cancelada com sucesso.' });
    } catch (error) {
        console.error("Erro ao cancelar assinatura:", error);
        res.status(500).json({ message: error.message || 'Erro interno ao cancelar a assinatura.' });
    }
};

const handleGetSubscriptionDetails = async (req, res) => {
    try {
        const { contaId } = req.user;
        const details = await subscriptionService.getSubscriptionDetails(contaId);
        res.status(200).json(details);
    } catch (error) {
        console.error("Erro ao buscar detalhes da assinatura:", error);
        res.status(500).json({ message: error.message || 'Erro interno ao buscar detalhes da assinatura.' });
    }
};

const handleUpdateSubscriptionCard = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { card_token_id } = req.body;

        if (!card_token_id) {
            return res.status(400).json({ message: 'O token do novo cartão é obrigatório.' });
        }

        await subscriptionService.updateSubscriptionCard(contaId, card_token_id);

        res.status(200).json({ message: 'Cartão de pagamento atualizado com sucesso!' });
    } catch (error) {
        console.error("Erro ao atualizar o cartão da assinatura:", error);
        res.status(500).json({ message: error.message || 'Erro interno ao atualizar o cartão.' });
    }
};

const handleCreatePixPayment = async (req, res) => {
    try {
        const usuario = req.user;
        const conta = await Conta.findById(usuario.contaId);

        if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }
        if (conta.statusAssinatura !== 'AGUARDANDO_PAGAMENTO') {
            return res.status(400).json({ message: 'Esta conta não está aguardando um pagamento.' });
        }

        const pixData = await subscriptionService.createPixSubscriptionPayment(usuario, conta);
        res.status(200).json(pixData);

    } catch (error) {
        console.error("Erro ao criar pagamento PIX para assinatura:", error);
        res.status(500).json({ message: error.message || 'Erro interno ao criar pagamento PIX.' });
    }
};

module.exports = {
    handleCreatePlan,
    handleSubscribe,
    cancelSubscription: handleCancelSubscription,
    handleUpgradePlan,
    handleGetSubscriptionDetails,
    handleUpdateSubscriptionCard,
    handleCreatePixPayment,
};
