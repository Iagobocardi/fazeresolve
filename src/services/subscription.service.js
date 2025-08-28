const { MercadoPagoConfig, PreApproval } = require('mercadopago');
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

        // =======================================================
        // ==>    A CORREÇÃO DEFINITIVA ESTÁ AQUI              <==
        // =======================================================
        // 1. Preparamos as opções para o cliente, incluindo os cabeçalhos customizados.
        const clientOptions = {
            accessToken,
            options: {
                timeout: 5000, // Exemplo de outra opção
                customHeaders: {}
            }
        };

        // 2. Adicionamos o deviceId aos cabeçalhos customizados, se ele existir.
        if (deviceId) {
            clientOptions.options.customHeaders['X-meli-session-id'] = deviceId;
        }

        // 3. Inicializamos o cliente com TODAS as configurações necessárias.
        const client = new MercadoPagoConfig(clientOptions);
        const subscription = new PreApproval(client);
        // -------------------------------------------------------

        const body = {
            preapproval_plan_id: planId,
            reason: `Assinatura do plano para ${user.nome}`,
            payer_email: user.email,
            card_token_id: cardTokenId,
            back_url: `${process.env.FRONTEND_URL}/provider/dashboard`,
        };

        // 4. A chamada `create` agora só precisa do `body`.
        // O SDK irá usar o `client` para adicionar a autorização e os cabeçalhos customizados.
        const result = await subscription.create({ body });

        console.log("--- ASSINATURA CRIADA COM SUCESSO ---", result);

        // Salva a referência no seu banco de dados...
        const newSubscription = new Subscription({
            userId: user._id,
            planId: planId,
            subscriptionId: result.id,
            status: result.status,
            nextPaymentDate: result.next_payment_date,
        });
        await newSubscription.save();

        return result;

    } catch (error) {
        console.error("--- ERRO da API do Mercado Pago ---");
        const errorResponse = error.cause?.body || error.response?.data || error.message;
        console.error(errorResponse);
        throw new Error('Erro ao criar assinatura no Mercado Pago.');
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

        // Conta os usuários atuais e adiciona 1 para simular o novo membro
        const currentUserCount = await Usuario.countDocuments({ contaId });
        const newUserCount = currentUserCount + 1;

        // Limites de base dos planos
        const baseLimits = { Profissional: 2, Premium: 5 };
        const baseLimit = baseLimits[conta.plano] || 0;

        let newTotalAmount = planInfo.base;
        if (newUserCount > baseLimit) {
            const extraUsers = newUserCount - baseLimit;
            newTotalAmount += extraUsers * planInfo.per_user_fee;
        }

        // Atualiza a assinatura no Mercado Pago
        const accessToken = mercadoPagoConfig.accessToken;
        if (!accessToken) throw new Error('Access Token do Mercado Pago não configurado.');

        const client = new MercadoPagoConfig({ accessToken });
        const preapproval = new PreApproval(client);

        const body = {
            auto_recurring: {
                transaction_amount: newTotalAmount,
            },
        };

        const result = await preapproval.update({
            preapprovalId: subscription.subscriptionId,
            body,
        });

        console.log(`Assinatura ${subscription.subscriptionId} atualizada para o novo valor de ${newTotalAmount}.`);

        return { success: true, result };

    } catch (error) {
        console.error("Erro ao atualizar o preço da assinatura:", error.message);
        // Propaga o erro para o controller poder lidar com ele
        throw new Error('Falha ao atualizar a cobrança no Mercado Pago.');
    }
};


module.exports = {
    // createPlan, // Adicione de volta se precisar
    createSubscription,
    updateSubscriptionPriceForNewUser,
};
