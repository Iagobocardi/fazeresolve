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
    console.log("--- [DEBUG] Iniciando criação de assinatura ---");
    console.log("Plan ID recebido:", planId);
    console.log("Card Token ID recebido:", cardTokenId);

    try {
        // =======================================================
        // ==> MUDANÇA PRINCIPAL: INICIALIZE O CLIENTE AQUI DENTRO <==
        // =======================================================
        const accessToken = mercadoPagoConfig.accessToken;
        
        // Verificação de segurança para garantir que o token não está vazio
        if (!accessToken) {
            console.error("--- [DEBUG] ERRO CRÍTICO: Access Token do Mercado Pago não encontrado! ---");
            throw new Error('Access Token do Mercado Pago não está configurado.');
        }

        const client = new MercadoPagoConfig({ accessToken });
        const subscription = new PreApproval(client);
        // -------------------------------------------------------

        const body = {
            preapproval_plan_id: planId,
            reason: `Assinatura do plano para ${user.nome}`,
            payer_email: user.email,
            card_token_id: cardTokenId,
            back_url: `${process.env.FRONTEND_URL}/provider/dashboard`,
        };
        
        console.log("--- [DEBUG] Corpo da requisição para o Mercado Pago ---");
        console.log(JSON.stringify(body, null, 2));

        // Prepara as opções da requisição, incluindo o deviceId como cabeçalho.
        const requestOptions = {
            headers: {
                'X-meli-session-id': deviceId
            }
        };

        console.log("--- [DEBUG] Opções da requisição (cabeçalhos) ---");
        console.log(JSON.stringify(requestOptions, null, 2));

        // O SDK lida com os cabeçalhos de autorização automaticamente através do 'client'
        const result = await subscription.create({ body, requestOptions });

        // Salva a referência da assinatura no banco de dados local
        const newSubscription = new Subscription({
            userId: user._id,
            planId: planId,
            subscriptionId: result.id,
            status: result.status,
            nextPaymentDate: result.next_payment_date,
        });
        await newSubscription.save();

        console.log("--- [DEBUG] Assinatura criada com sucesso ---", result);
        return result;

    } catch (error) {
        console.error("--- [DEBUG] ERRO da API do Mercado Pago ---");
        // A API do SDK pode encapsular o erro. Vamos verificar as duas possibilidades.
        const errorResponse = error.cause?.body || error.response?.data || error.message;
        console.error(errorResponse);
        console.error("-------------------------------------------");
        throw new Error('Erro ao criar assinatura no Mercado Pago.');
    }
};

module.exports = {
    createPlan,
    createSubscription,
};
