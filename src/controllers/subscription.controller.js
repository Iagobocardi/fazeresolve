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

        // --- FLUXO SEGURO COM ATIVAÇÃO VIA WEBHOOK ---

        // CASO 1: FALHA IMEDIATA (cartão recusado, erro de dados, etc.)
        // Se a resposta da API contiver um erro explícito ou um status que não seja de sucesso ou pendência.
        if (subscriptionResult.error || (subscriptionResult.status && !['authorized', 'pending'].includes(subscriptionResult.status))) {
            console.warn(`[Subscribe] Falha na criação da assinatura para conta ${conta._id}. Status: ${subscriptionResult.status || 'N/A'}`);
            
            const errorMessage = subscriptionResult.message || 'O pagamento foi recusado. Verifique os dados do cartão ou tente outro.';
            
            return res.status(402).json({
                message: errorMessage,
                details: subscriptionResult
            });
        }

        // CASO 2: SUCESSO NA SUBMISSÃO (pagamento autorizado ou pendente)
        // Se o pagamento não falhou imediatamente, salvamos o ID e aguardamos o webhook.
        console.log(`[Subscribe] Assinatura submetida ao MP com status '${subscriptionResult.status}'. Aguardando confirmação via webhook. ID: ${subscriptionResult.id}`);
        
        conta.mercadoPagoSubscriptionId = subscriptionResult.id;
        await conta.save();
        
        // Informa ao front-end que o processo está pendente de confirmação final.
        return res.status(200).json({
            message: 'Seu pagamento está sendo processado. Você receberá a confirmação em breve e seu acesso será liberado.'
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

module.exports = {
    handleCreatePlan,
    handleSubscribe,
    cancelSubscription: handleCancelSubscription,
    handleUpgradePlan,
};
