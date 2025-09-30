const mercadopago = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const Subscription = require('../models/subscription.model.js');
const Conta = require('../models/conta.model.js');
const Usuario = require('../models/usuario.model.js');

// Preços e taxas dos planos
const PLAN_PRICING = {
    Profissional: { base: 129, per_user_fee: 29 },
    Premium: { base: 199, per_user_fee: 19 }
};

// NOTA: A função createPlan foi removida para simplificar,
// já que o foco é na criação da assinatura. Se precisar dela,
// ela também deve inicializar o seu próprio cliente internamente.

/**
 * Cria uma nova assinatura para um usuário.
 * @param {string} planId - O ID do plano do Mercado Pago.
 * @param {object} user - O objeto do usuário (prestador).
 * @param {string} cardTokenId - O ID do token do cartão gerado no frontend.
 * @param {string} [deviceId] - O ID da sessão do dispositivo (opcional).
 * @returns {Promise<object>} O objeto da assinatura criada.
 */
const createSubscription = async (planId, user, cardTokenId, deviceId) => {
    try {
        const accessToken = mercadoPagoConfig.accessToken;

        if (!accessToken) {
            console.error("--- ERRO CRÍTICO: Access Token do Mercado Pago não foi carregado! ---");
            throw new Error('Access Token do Mercado Pago não está configurado no ambiente.');
        }
        
        // Configura o SDK do Mercado Pago (V2) com o Access Token
        mercadopago.configure({
            access_token: accessToken,
        });

        // O corpo da requisição para criar uma assinatura com plano.
        const body = {
            preapproval_plan_id: planId,
            card_token_id: cardTokenId,
            payer_email: user.email,
            external_reference: user.contaId,
            status: 'authorized'
        };
        
        // As opções da requisição, incluindo o cabeçalho de prevenção a fraudes
        const requestOptions = {
            headers: {}
        };
        if (deviceId) {
            requestOptions.headers['X-meli-session-id'] = deviceId;
            console.log(`[Service] Usando deviceId para prevenção a fraudes: ${deviceId}`);
        }

        // A chamada para a API é feita diretamente pelo objeto 'mercadopago' (V2)
        const result = await mercadopago.preapproval.create(body, requestOptions);

        console.log("--- ASSINATURA CRIADA COM SUCESSO ---", result.body);

        // A lógica de salvar no banco de dados foi removida daqui
        // e é tratada exclusivamente pelo controller, que já faz isso de forma mais completa.

        return result.body;

    } catch (error) {
        console.error("--- ERRO da API do Mercado Pago ---");
        
        // A resposta de erro da V2 geralmente está em `error.response.data`
        const apiError = error.response?.data;

        // Se encontrarmos um objeto de erro estruturado, o retornamos para o controller
        if (apiError && typeof apiError === 'object') {
            console.error("Resposta de erro da API (estruturada):", JSON.stringify(apiError, null, 2));
            return { 
                error: true, 
                message: apiError.message || 'Erro no gateway de pagamento.',
                details: apiError 
            };
        }

        // Se nenhuma das condições acima for atendida, é um erro inesperado.
        console.error("Erro não estruturado ou inesperado:", error.message);
        throw new Error('Ocorreu um erro interno ao se comunicar com o gateway de pagamento.');
    }
};

const updateSubscriptionPriceForNewUser = async (contaId) => {
    try {
        const conta = await Conta.findById(contaId);
        if (!conta) throw new Error('Conta não encontrada.');

        const planInfo = PLAN_PRICING[conta.plano];
        if (!planInfo) {
            console.log(`Plano ${conta.plano} não tem preço dinâmico. Nenhuma atualização de preço necessária.`);
            return { success: true };
        }

        const owner = await Usuario.findOne({ contaId, role: 'Dono' });
        if (!owner) throw new Error('Dono da conta não encontrado.');

        const subscription = await Subscription.findOne({ userId: owner._id });
        if (!subscription) throw new Error('Assinatura não encontrada para esta conta.');

        const currentUserCount = await Usuario.countDocuments({ contaId });
        const newUserCount = currentUserCount + 1;

        const baseLimits = { Profissional: 2, Premium: 5 };
        const baseLimit = baseLimits[conta.plano] || 0;

        let newTotalAmount = planInfo.base;
        if (newUserCount > baseLimit) {
            const extraUsers = newUserCount - baseLimit;
            newTotalAmount += extraUsers * planInfo.per_user_fee;
        }

        const accessToken = mercadoPagoConfig.accessToken;
        if (!accessToken) throw new Error('Access Token do Mercado Pago não configurado.');

        mercadopago.configure({ access_token: accessToken });

        const updateData = {
            id: subscription.subscriptionId,
            auto_recurring: {
                transaction_amount: newTotalAmount,
            },
        };

        const result = await mercadopago.preapproval.update(updateData);

        console.log(`Assinatura ${subscription.subscriptionId} atualizada para o novo valor de ${newTotalAmount}.`);

        return { success: true, result: result.body };

    } catch (error) {
        console.error("Erro ao atualizar o preço da assinatura:", error.message);
        throw new Error('Falha ao atualizar a cobrança no Mercado Pago.');
    }
};

const cancelSubscription = async (contaId) => {
    try {
        const conta = await Conta.findById(contaId);
        if (!conta || !conta.mercadoPagoSubscriptionId) {
            throw new Error('Assinatura não encontrada ou já cancelada.');
        }

        const accessToken = mercadoPagoConfig.accessToken;
        if (!accessToken) throw new Error('Access Token do Mercado Pago não configurado.');
        
        mercadopago.configure({ access_token: accessToken });

        const updateData = {
            id: conta.mercadoPagoSubscriptionId,
            status: 'cancelled',
        };

        const result = await mercadopago.preapproval.update(updateData);

        if (result.body.status === 'cancelled') {
            conta.statusAssinatura = 'CANCELADO';
            conta.mercadoPagoSubscriptionId = null;
            conta.planId = null;
            await conta.save();
            console.log(`Assinatura ${result.body.id} cancelada com sucesso.`);
        } else {
            throw new Error('Não foi possível cancelar a assinatura no Mercado Pago.');
        }

        return { success: true, result: result.body };

    } catch (error) {
        console.error("Erro ao cancelar a assinatura no serviço:", error.message);
        throw new Error('Falha ao cancelar a assinatura.');
    }
};

const upgradeSubscription = async (contaId, newPlanName) => {
    try {
        const PLANS = require('../config/plans.config.js');

        const conta = await Conta.findById(contaId);
        if (!conta) throw new Error('Conta não encontrada.');
        if (conta.statusAssinatura !== 'ATIVO') throw new Error('A conta não possui uma assinatura ativa para ser atualizada.');
        if (!conta.mercadoPagoSubscriptionId) throw new Error('ID da assinatura do Mercado Pago não encontrado na conta.');

        const currentPlan = PLANS.find(p => p.name === conta.plano);
        const newPlan = PLANS.find(p => p.name === newPlanName);

        if (!currentPlan) throw new Error(`Plano atual "${conta.plano}" não foi encontrado nas configurações.`);
        if (!newPlan) throw new Error(`Novo plano "${newPlanName}" é inválido.`);
        if (conta.plano === newPlanName) throw new Error('Você já está neste plano.');

        const currentPlanPrice = parseFloat(currentPlan.monthly.price);
        const newPlanPrice = parseFloat(newPlan.monthly.price);

        if (newPlanPrice <= currentPlanPrice) throw new Error('O upgrade só é permitido para um plano de valor superior.');

        const isAnnual = currentPlan.annual.id === conta.planId;
        const newPlanId = isAnnual ? newPlan.annual.id : newPlan.monthly.id;

        if (!newPlanId) throw new Error(`ID do plano para ${newPlanName} (${isAnnual ? 'Anual' : 'Mensal'}) não encontrado.`);

        const accessToken = mercadoPagoConfig.accessToken;
        if (!accessToken) throw new Error('Access Token do Mercado Pago não configurado.');

        mercadopago.configure({ access_token: accessToken });

        const updateData = {
            id: conta.mercadoPagoSubscriptionId,
            preapproval_plan_id: newPlanId,
        };

        const updateResult = await mercadopago.preapproval.update(updateData);

        console.log(`[Upgrade] Assinatura ${conta.mercadoPagoSubscriptionId} atualizada no MP. Status: ${updateResult.body.status}`);

        conta.plano = newPlanName;
        conta.planId = newPlanId;
        await conta.save();

        const newPermissions = newPlan.permissions;
        await Usuario.updateMany({ contaId: contaId }, { $set: { permissoes: newPermissions } });
        console.log(`[Upgrade] Conta ${contaId} e seus usuários atualizados para o plano ${newPlanName}.`);

        return {
            newPlan: newPlanName,
            permissions: newPermissions,
            mercadoPagoStatus: updateResult.body.status
        };

    } catch (error) {
        console.error("Erro ao fazer upgrade da assinatura:", error.message);
        throw new Error(error.message || 'Falha ao atualizar a assinatura no Mercado Pago.');
    }
};

const getSubscriptionDetails = async (contaId) => {
    const conta = await Conta.findById(contaId);
    if (!conta) throw new Error('Conta não encontrada.');

    if (!conta.mercadoPagoSubscriptionId) {
        return {
            statusLocal: conta.statusAssinatura,
            plano: conta.plano,
            message: 'Nenhuma assinatura ativa encontrada no gateway de pagamento.'
        };
    }

    mercadopago.configure({ access_token: mercadoPagoConfig.accessToken });
    
    const mpSubscriptionResult = await mercadopago.preapproval.get(conta.mercadoPagoSubscriptionId);
    const mpSubscription = mpSubscriptionResult.body;

    return {
        statusLocal: conta.statusAssinatura,
        statusGateway: mpSubscription.status,
        plano: conta.plano,
        proximaCobranca: mpSubscription.next_payment_date,
        metodoPagamento: mpSubscription.payment_method_id,
    };
};

const updateSubscriptionCard = async (contaId, cardTokenId) => {
    const conta = await Conta.findById(contaId);
    if (!conta || !conta.mercadoPagoSubscriptionId) {
        throw new Error('Nenhuma assinatura ativa encontrada para esta conta.');
    }

    mercadopago.configure({ access_token: mercadoPagoConfig.accessToken });

    const updateData = {
        id: conta.mercadoPagoSubscriptionId,
        card_token_id: cardTokenId,
    };

    const result = await mercadopago.preapproval.update(updateData);

    console.log(`[Service] Cartão da assinatura ${conta.mercadoPagoSubscriptionId} atualizado. Novo status: ${result.body.status}`);

    return result.body;
};

const mercadoPagoService = require('./mercadoPago.service.js');
const PLANS = require('../config/plans.config');

const createPixSubscriptionPayment = async (usuario, conta) => {
    const planoInfo = PLANS.find(p => p.name === conta.plano);
    if (!planoInfo) throw new Error('Plano não encontrado nas configurações.');
    
    const transactionAmount = parseFloat(planoInfo.monthly.price);

    const paymentData = {
        transaction_amount: transactionAmount,
        description: `Pagamento da assinatura do plano ${conta.plano}`,
        payment_method_id: 'pix',
        payer: {
            email: usuario.email,
            first_name: usuario.nome.split(' ')[0],
            last_name: usuario.nome.split(' ').slice(1).join(' ') || '.',
        },
        external_reference: conta._id.toString(),
    };

    const pixResult = await mercadoPagoService.createPixPayment(paymentData);

    return {
        paymentId: pixResult.id,
        qrCode: pixResult.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: pixResult.point_of_interaction.transaction_data.qr_code_base64,
    };
};

module.exports = {
    createSubscription,
    updateSubscriptionPriceForNewUser,
    cancelSubscription,
    upgradeSubscription,
    getSubscriptionDetails,
    updateSubscriptionCard,
    createPixSubscriptionPayment,
};
