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

        // Verifica se a resposta da API indica uma falha ou recusa de pagamento
        if (subscriptionResult.error || (subscriptionResult.status && subscriptionResult.status !== 'authorized')) {
            console.warn(`[Subscribe] Falha na criação da assinatura para conta ${conta._id}. Status: ${subscriptionResult.status || 'N/A'}`);
            
            let errorMessage;
            // Caso especial: Se o gateway de pagamento retornar um erro de servidor (500),
            // fornecemos uma mensagem mais amigável em vez do "Internal server error" deles.
            if (subscriptionResult.status === 500) {
                errorMessage = 'Ocorreu um erro geral no gateway de pagamento. Por favor, tente novamente ou utilize outro método de pagamento.';
            } else {
                // Para outros erros, usamos a mensagem da API ou um fallback padrão.
                errorMessage = subscriptionResult.message || 'O pagamento foi recusado. Verifique os dados do cartão ou tente outro.';
            }
            
            return res.status(402).json({
                message: errorMessage,
                details: subscriptionResult // Retorna o objeto de erro completo para o frontend
            });
        }

        console.log(`[Subscribe] Assinatura submetida ao Mercado Pago com ID: ${subscriptionResult.id}`);

        // Armazena o ID da assinatura do Mercado Pago na conta para referência futura.
        // O status da conta permanece 'AGUARDANDO_PAGAMENTO' até a confirmação via webhook.
        conta.mercadoPagoSubscriptionId = subscriptionResult.id;
        await conta.save();
        console.log(`[Subscribe] ID da assinatura ${conta.mercadoPagoSubscriptionId} salvo na conta ${conta._id}. Aguardando confirmação do pagamento.`);

        // Não gera um novo token nem retorna dados de usuário.
        // O front-end deve informar ao usuário que o pagamento está sendo processado.
        res.status(200).json({
            message: 'Seu pagamento está sendo processado. Você receberá a confirmação em breve e seu acesso será liberado.'
        });

    } catch (error) {
        // Este bloco 'catch' agora lida apenas com erros inesperados do servidor (erros 500)
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

module.exports = {
    handleCreatePlan,
    handleSubscribe,
    cancelSubscription: async (req, res) => {
        try {
            const { contaId } = req.user;
            await subscriptionService.cancelSubscription(contaId);
            res.status(200).json({ message: 'Assinatura cancelada com sucesso.' });
        } catch (error) {
            console.error("Erro ao cancelar assinatura:", error);
            res.status(500).json({ message: 'Erro interno ao cancelar a assinatura.' });
        }
    },
    handleUpgradePlan,
};
