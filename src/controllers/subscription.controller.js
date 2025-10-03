const jwt = require('jsonwebtoken');
const subscriptionService = require('../services/subscription.service.js');
const Cliente = require('../models/cliente.model.js');
const Usuario = require('../models/usuario.model.js');
const Conta = require('../models/conta.model');
const Assinatura = require('../models/subscription.model.js');

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

        console.log(`[Subscribe v1.1] Iniciando fluxo de assinatura para usuário ${usuario._id} no plano ${conta.planId}`);

        // 1. Cria a assinatura no gateway de pagamento (Mercado Pago)
        const gatewayResult = await subscriptionService.createSubscription(conta.planId, usuario, cardTokenId, deviceId);

        if (gatewayResult.error) {
            console.warn(`[Subscribe v1.1] Gateway recusou a criação da assinatura para o usuário ${usuario._id}. Motivo: ${gatewayResult.message}`);
            return res.status(402).json({
                message: gatewayResult.message || 'Não foi possível processar sua assinatura. Verifique os dados do cartão.',
                details: gatewayResult.details
            });
        }

        console.log(`[Subscribe v1.1] Assinatura criada no gateway. ID: ${gatewayResult.id}, Payer ID: ${gatewayResult.payer_id}`);

        // Passo Adicional: Verificar se o Customer ID do gateway já existe para outro usuário.
        // Isso previne que um mesmo cartão (mesmo dono) seja usado para assinar duas contas diferentes.
        const existingSubscription = await Assinatura.findOne({ 
            gatewayCustomerId: gatewayResult.payer_id,
            userId: { $ne: usuario._id } // Garante que não estamos pegando a assinatura do próprio usuário (em um caso de re-tentativa)
        });

        if (existingSubscription) {
            console.warn(`[Subscribe v1.1] Tentativa de assinatura duplicada. Customer ID ${gatewayResult.payer_id} já existe para o usuário ${existingSubscription.userId}.`);
            
            // Cancela a assinatura recém-criada no gateway para evitar cobranças indevidas.
            // É importante ter uma função de cancelamento que opere diretamente com o ID do gateway.
            await subscriptionService.cancelSubscriptionByGatewayId(gatewayResult.id);
            
            return res.status(409).json({ // 409 Conflict é o status ideal para este caso.
                message: 'Este método de pagamento já está associado a outra conta. Por favor, utilize um cartão diferente ou entre em contato com o suporte.'
            });
        }

        // 2. Imediatamente cria/atualiza a assinatura no DB local com status 'pendente_confirmacao'
        const assinaturaData = {
            planoId: conta.planId,
            gateway: 'mercadopago',
            gatewaySubscriptionId: gatewayResult.id,
            gatewayCustomerId: gatewayResult.payer_id, // Assumindo que o serviço retorna o payer_id
            status: 'pendente_confirmacao',
            dataProximaCobranca: gatewayResult.next_payment_date,
            carenciaExpiraEm: null
        };

        const assinatura = await Assinatura.findOneAndUpdate(
            { userId: usuario._id },
            assinaturaData,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        console.log(`[Subscribe v1.1] Assinatura ${assinatura._id} salva no DB como 'pendente_confirmacao'.`);

        // 3. Imediatamente atualiza o status do usuário para 'ativo' para liberar o acesso
        const userToUpdate = await Usuario.findById(usuario._id);
        const PLANS = require('../config/plans.config.js');
        
        // Encontra o nome do plano correspondente ao planId
        const plan = PLANS.find(p => p.monthly.id === conta.planId || p.annual.id === conta.planId);
        if (!plan) {
            // Se o plano não for encontrado, lança um erro para evitar salvar dados inconsistentes
            console.error(`[Subscribe v1.1] Plano com ID ${conta.planId} não encontrado nas configurações.`);
            return res.status(500).json({ message: 'Configuração de plano inválida. Contate o suporte.' });
        }

        userToUpdate.status = 'ativo';
        userToUpdate.plano = plan.name; // Atribui o nome do plano (e.g., 'Essencial')
        await userToUpdate.save();
        console.log(`[Subscribe v1.1] Usuário ${userToUpdate._id} atualizado para status 'ativo' com o plano '${plan.name}'.`);

        // 4. Retorna sucesso com um token JWT para login automático
        const payload = { id: userToUpdate._id, contaId: conta._id, role: userToUpdate.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        const finalUser = await Usuario.findById(userToUpdate._id).select('-password');

        return res.status(201).json({
            message: 'Acesso liberado! Estamos processando seu pagamento e avisaremos sobre qualquer novidade.',
            token,
            usuario: finalUser
        });

    } catch (error) {
        console.error('Erro inesperado no servidor durante o processo de assinatura (v1.1):', error);
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

/**
 * Controller para obter os detalhes da conta e assinatura do usuário logado.
 * Endpoint: GET /api/assinaturas/minha-conta (v1.1)
 */
const handleGetSubscriptionDetails = async (req, res) => {
    try {
        const userId = req.user.id; // O ID do usuário vem do token JWT

        const usuario = await Usuario.findById(userId).select('-password');
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const assinatura = await Assinatura.findOne({ userId: userId });
        if (!assinatura) {
            return res.status(404).json({ message: 'Nenhuma assinatura encontrada para este usuário.' });
        }

        // Combina as informações mais relevantes para o frontend
        const detalhesDaConta = {
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                status: usuario.status, // e.g., 'ativo', 'ativo_em_carencia', 'bloqueado_pagamento'
                plano: usuario.plano
            },
            assinatura: {
                id: assinatura._id,
                status: assinatura.status, // e.g., 'ativa', 'pagamento_pendente', 'pausada'
                planoId: assinatura.planoId,
                dataInicio: assinatura.dataInicio,
                dataProximaCobranca: assinatura.dataProximaCobranca,
                carenciaExpiraEm: assinatura.carenciaExpiraEm // Crucial para o aviso no frontend
            }
        };

        res.status(200).json(detalhesDaConta);

    } catch (error) {
        console.error("Erro ao buscar detalhes da conta/assinatura (v1.1):", error);
        res.status(500).json({ message: 'Erro interno ao buscar detalhes da sua conta.' });
    }
};

/**
 * Controller para regularizar um pagamento pendente ou pausado.
 * O usuário envia um novo token de cartão para atualizar a assinatura e forçar uma nova cobrança.
 * Endpoint: POST /api/assinaturas/regularizar (v1.1)
 */
const handleRegularizePayment = async (req, res) => {
    try {
        const { cardTokenId } = req.body;
        const userId = req.user.id;

        if (!cardTokenId) {
            return res.status(400).json({ message: 'O token do novo cartão é obrigatório.' });
        }

        const assinatura = await Assinatura.findOne({ userId });
        if (!assinatura) {
            return res.status(404).json({ message: 'Assinatura não encontrada.' });
        }

        // Permite a regularização apenas se o pagamento estiver pendente ou a conta pausada
        if (!['pagamento_pendente', 'pausada'].includes(assinatura.status)) {
            return res.status(400).json({
                message: `Sua assinatura com status '${assinatura.status}' não pode ser regularizada desta forma.`
            });
        }

        console.log(`[Regularize v1.1] Iniciando regularização para assinatura ${assinatura._id} (Gateway ID: ${assinatura.gatewaySubscriptionId}).`);

        // Delega a lógica de atualização do cartão para o serviço de assinatura.
        // Este serviço deve interagir com o gateway para trocar o cartão.
        // A API do Mercado Pago, ao trocar o cartão, pode re-processar o pagamento se houver uma fatura pendente.
        await subscriptionService.updateSubscriptionCard(assinatura.gatewaySubscriptionId, cardTokenId);

        // A reativação da conta é assíncrona, via webhook, após o pagamento ser 'approved'.
        res.status(200).json({
            message: 'Seu método de pagamento foi atualizado. Uma nova cobrança será feita. Você será notificado assim que o pagamento for confirmado e seu acesso reativado.'
        });

    } catch (error) {
        console.error("Erro ao regularizar pagamento (v1.1):", error);
        res.status(500).json({ message: error.message || 'Erro interno ao tentar regularizar seu pagamento.' });
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

const handleUpdatePaymentMethod = async (req, res) => {
    try {
        const { cardTokenId } = req.body;
        const userId = req.user.id;

        if (!cardTokenId) {
            return res.status(400).json({ message: 'O token do novo cartão é obrigatório.' });
        }

        const assinatura = await Assinatura.findOne({ userId });
        if (!assinatura || assinatura.status !== 'ativa') {
            return res.status(404).json({ message: 'Nenhuma assinatura ativa encontrada para atualizar.' });
        }

        console.log(`[Update Card] Iniciando atualização do método de pagamento para a assinatura ${assinatura._id} (Gateway ID: ${assinatura.gatewaySubscriptionId}).`);

        // Delega a lógica de atualização para o serviço de assinatura
        await subscriptionService.updateSubscriptionCard(assinatura.gatewaySubscriptionId, cardTokenId);

        res.status(200).json({
            message: 'Seu método de pagamento foi atualizado com sucesso!'
        });

    } catch (error) {
        console.error("Erro ao atualizar o método de pagamento:", error);
        // O serviço pode lançar um erro com detalhes específicos do gateway
        res.status(500).json({ message: error.message || 'Erro interno ao tentar atualizar seu método de pagamento.' });
    }
};

module.exports = {
    handleCreatePlan,
    handleSubscribe,
    cancelSubscription: handleCancelSubscription,
    handleUpgradePlan,
    handleGetSubscriptionDetails,
    handleRegularizePayment,
    handleCreatePixPayment,
    handleUpdatePaymentMethod,
};
