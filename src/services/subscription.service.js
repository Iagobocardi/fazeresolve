const { MercadoPagoConfig, PreApprovalPlan, PreApproval } = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const Subscription = require('../models/subscription.model.js');

const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });

/**
 * Cria um novo plano de assinatura no Mercado Pago.
 * @param {object} planData - Os dados do plano (nome, preço, frequência).
 * @returns {Promise<object>} O objeto do plano criado.
 */
const createPlan = async (planData) => {
    try {
        const plan = new PreApprovalPlan(client);

        const body = {
            reason: planData.name,
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: planData.price,
                currency_id: 'BRL',
            },
            back_url: `${process.env.FRONTEND_URL}/provider/dashboard`,
        };

        const result = await plan.create({ body });
        return result;
    } catch (error) {
        console.error('Erro ao criar plano de assinatura:', error);
        throw new Error('Erro ao criar plano de assinatura no Mercado Pago.');
    }
};

/**
 * Cria uma nova assinatura para um usuário.
 * @param {string} planId - O ID do plano do Mercado Pago.
 * @param {object} user - O objeto do usuário (prestador).
 * @param {string} cardTokenId - O ID do token do cartão gerado no frontend.
 * @returns {Promise<object>} O objeto da assinatura criada.
 */
const createSubscription = async (planId, user, cardTokenId, deviceId) => {
    try {
        const accessToken = mercadoPagoConfig.accessToken;
        if (!accessToken) {
            throw new Error('Access Token do Mercado Pago não está configurado.');
        }

        const client = new MercadoPagoConfig({ accessToken });
        const subscription = new PreApproval(client);

        const body = {
            preapproval_plan_id: planId,
            reason: `Assinatura do plano para ${user.nome}`,
            payer_email: user.email,
            card_token_id: cardTokenId,
            back_url: `${process.env.FRONTEND_URL}/provider/dashboard`,
            status: "authorized",
        };

        const requestOptions = {
            headers: {
                'X-meli-session-id': deviceId
            }
        };

        const result = await subscription.create({ body, requestOptions });

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
        console.error("Erro ao criar assinatura no Mercado Pago:", error.cause?.body || error.response?.data || error.message);
        throw new Error('Erro ao criar assinatura no Mercado Pago.');
    }
};

module.exports = {
    createPlan,
    createSubscription,
};
