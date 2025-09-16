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
            
            // Extrai uma mensagem de erro mais específica, se disponível
            const errorMessage = subscriptionResult.message || 'O pagamento foi recusado. Verifique os dados do cartão ou tente outro.';
            
            return res.status(402).json({
                message: errorMessage,
                details: subscriptionResult // Retorna o objeto de erro completo para o frontend
            });
        }

        console.log(`[Subscribe] Assinatura criada com sucesso no Mercado Pago com ID: ${subscriptionResult.id}`);

        // Atualiza o status da CONTA e armazena o ID da assinatura
        conta.statusAssinatura = 'ATIVO';
        conta.mercadoPagoSubscriptionId = subscriptionResult.id;
        await conta.save();
        console.log(`[Subscribe] Conta ${conta._id} atualizada para ATIVO.`);

        // Gera um novo token JWT definitivo para o USUÁRIO
        const payload = { id: usuario._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        const finalUser = await Usuario.findById(usuario._id);

        res.status(201).json({
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

    } catch (error) {
        // Este bloco 'catch' agora lida apenas com erros inesperados do servidor (erros 500)
        console.error('Erro inesperado no servidor durante o processo de assinatura:', error);
        res.status(500).json({
            message: 'Ocorreu um erro interno no servidor. Nossa equipe já foi notificada.',
            details: error.message
        });
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
    }
};
