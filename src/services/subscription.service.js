const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const Subscription = require('../models/subscription.model.js');

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

module.exports = {
    // createPlan, // Adicione de volta se precisar
    createSubscription,
};
