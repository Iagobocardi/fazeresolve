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
            console.error("Access Token do Mercado Pago não está configurado no ambiente.");
            throw new Error('Access Token do Mercado Pago não está configurado no ambiente.');
        }
        
        const client = new MercadoPagoConfig({ accessToken });
        const subscription = new PreApproval(client);

        const body = {
            preapproval_plan_id: planId,
            card_token_id: cardTokenId,
            payer_email: user.email,
            external_reference: user.contaId,
            status: 'authorized'
        };

        const requestOptions = {
            customHeaders: {}
        };
        if (deviceId) {
            requestOptions.customHeaders['X-meli-session-id'] = deviceId;
        }

        const result = await subscription.create({ body, requestOptions });

        // A lógica de salvar a assinatura no banco de dados foi removida deste serviço.
        // A responsabilidade agora é exclusivamente do controller, que já possui a lógica correta
        // para mapear o status e garantir a consistência dos dados.

        return result;

    } catch (error) {
        console.error("Erro ao criar assinatura no Mercado Pago:", error.message);
        const apiError = error.cause?.body || error.response?.data || error.data;

        if (apiError) {
            console.error("Detalhes do erro da API Mercado Pago:", JSON.stringify(apiError, null, 2));
        }
        
        if (apiError && typeof apiError === 'object') {
            return apiError;
        }

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

const cancelSubscription = async (contaId) => {
    try {
        const conta = await Conta.findById(contaId);
        if (!conta || !conta.mercadoPagoSubscriptionId) {
            throw new Error('Assinatura não encontrada ou já cancelada.');
        }

        const accessToken = mercadoPagoConfig.accessToken;
        if (!accessToken) throw new Error('Access Token do Mercado Pago não configurado.');

        const client = new MercadoPagoConfig({ accessToken });
        const preapproval = new PreApproval(client);

        const result = await preapproval.update({
            preapprovalId: conta.mercadoPagoSubscriptionId,
            body: { status: 'cancelled' },
        });

        if (result.status === 'cancelled') {
            conta.statusAssinatura = 'CANCELADO';
            conta.mercadoPagoSubscriptionId = null;
            conta.planId = null;
            await conta.save();
            console.log(`Assinatura ${conta.mercadoPagoSubscriptionId} cancelada com sucesso.`);
        } else {
            throw new Error('Não foi possível cancelar a assinatura no Mercado Pago.');
        }

        return { success: true, result };

    } catch (error) {
        console.error("Erro ao cancelar a assinatura no serviço:", error.message);
        throw new Error('Falha ao cancelar a assinatura.');
    }
};

const upgradeSubscription = async (contaId, newPlanName) => {
    try {
        const PLANS = require('../config/plans.config.js');

        // 1. Validar a conta e o plano
        const conta = await Conta.findById(contaId);
        if (!conta) {
            throw new Error('Conta não encontrada.');
        }
        // if (conta.statusAssinatura !== 'ATIVO') {
        //     throw new Error('A conta não possui uma assinatura ativa para ser atualizada.');
        // }
        const currentPlan = PLANS.find(p => p.name === conta.plano);
        const newPlan = PLANS.find(p => p.name === newPlanName);

        if (!currentPlan) {
            throw new Error(`Plano atual "${conta.plano}" não foi encontrado nas configurações.`);
        }
        if (!newPlan) {
            throw new Error(`Novo plano "${newPlanName}" é inválido.`);
        }
        if (conta.plano === newPlanName) {
            throw new Error('Você já está neste plano.');
        }

        const currentPlanPrice = parseFloat(currentPlan.monthly.price);
        const newPlanPrice = parseFloat(newPlan.monthly.price);

        if (newPlanPrice <= currentPlanPrice) {
            throw new Error('O upgrade só é permitido para um plano de valor superior.');
        }

        // 2. Determinar o ID do novo plano (mensal/anual)
        const isAnnual = currentPlan.annual.id === conta.planId;
        const newPlanId = isAnnual ? newPlan.annual.id : newPlan.monthly.id;

        if (!newPlanId) {
            throw new Error(`ID do plano para ${newPlanName} (${isAnnual ? 'Anual' : 'Mensal'}) não encontrado.`);
        }

        // Se não houver ID de assinatura, significa que é um upgrade de um plano gratuito/essencial.
        // O fluxo correto é o front-end iniciar uma NOVA assinatura.
        if (!conta.mercadoPagoSubscriptionId) {
            console.log(`[Upgrade] A conta ${contaId} não tem ID de assinatura. Solicitando nova criação para o plano ${newPlanId}.`);
            return {
                needsCreation: true,
                newPlanId: newPlanId,
            };
        }

        // 3. Atualizar a assinatura no Mercado Pago
        const accessToken = mercadoPagoConfig.accessToken;
        if (!accessToken) {
            throw new Error('Access Token do Mercado Pago não configurado.');
        }

        const client = new MercadoPagoConfig({ accessToken });
        const preapproval = new PreApproval(client);

        const body = {
            preapproval_plan_id: newPlanId,
        };

        const updateResult = await preapproval.update({
            preapprovalId: conta.mercadoPagoSubscriptionId,
            body,
        });

        console.log(`[Upgrade] Assinatura ${conta.mercadoPagoSubscriptionId} atualizada no MP. Status: ${updateResult.status}`);

        // 4. Atualizar o banco de dados local
        conta.plano = newPlanName;
        conta.planId = newPlanId;
        await conta.save();

        const newPermissions = newPlan.permissions;
        await Usuario.updateMany(
            { contaId: contaId },
            { $set: { permissoes: newPermissions } }
        );
        console.log(`[Upgrade] Conta ${contaId} e seus usuários atualizados para o plano ${newPlanName}.`);

        // 5. Retornar o resultado
        return {
            newPlan: newPlanName,
            permissions: newPermissions,
            mercadoPagoStatus: updateResult.status
        };

    } catch (error) {
        console.error("Erro ao fazer upgrade da assinatura:", error.message);
        // Propaga o erro para o controller poder lidar com ele
        throw new Error(error.message || 'Falha ao atualizar a assinatura no Mercado Pago.');
    }
};


const getSubscriptionDetails = async (contaId) => {
    const conta = await Conta.findById(contaId).lean();

    if (!conta) {
        // Retorna null em vez de lançar um erro para não quebrar a Promise.all no controller.
        console.warn(`[Sub Service] getSubscriptionDetails: Conta ${contaId} não encontrada.`);
        return null;
    }

    if (!conta.mercadoPagoSubscriptionId) {
        return {
            statusLocal: conta.statusAssinatura,
            plano: conta.plano,
            message: 'Nenhuma assinatura ativa encontrada no gateway de pagamento.',
            metodoPagamento: null,
        };
    }

    try {
        const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
        const preapproval = new PreApproval(client);

        const mpSubscription = await preapproval.get({ id: conta.mercadoPagoSubscriptionId });
        
        // Log detalhado para depuração da resposta da API
        console.log(`[Sub Service] Resposta completa da API MP para getSubscriptionDetails (conta ${contaId}):`, JSON.stringify(mpSubscription, null, 2));

        let metodoPagamento = null;
        // Estrutura de dados da API confirmada: o cartão está dentro de `card_info`
        if (mpSubscription.card_info) {
            metodoPagamento = {
                last4: mpSubscription.card_info.last_four_digits,
                brand: mpSubscription.card_info.payment_method.name,
            };
        } else {
             console.warn(`[Sub Service] Não foi possível encontrar 'card_info' na resposta da assinatura ${conta.mercadoPagoSubscriptionId}.`);
        }

        return {
            statusLocal: conta.statusAssinatura,
            statusGateway: mpSubscription.status,
            plano: conta.plano,
            proximaCobranca: mpSubscription.next_payment_date,
            metodoPagamento: metodoPagamento,
        };
    } catch (error) {
        console.error(`[Sub Service] Erro ao buscar detalhes da assinatura ${conta.mercadoPagoSubscriptionId} no MP:`, error.message);
        // Retorna um objeto parcial para não quebrar o frontend em caso de falha na API do MP
        return {
            statusLocal: conta.statusAssinatura,
            plano: conta.plano,
            message: 'Falha ao comunicar com o gateway de pagamento.',
            metodoPagamento: null,
        };
    }
};

const updateSubscriptionCard = async (gatewaySubscriptionId, cardTokenId) => {
    if (!gatewaySubscriptionId) {
        throw new Error('O ID da assinatura do gateway é obrigatório para atualizar o cartão.');
    }

    const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
    const preapproval = new PreApproval(client);

    const body = {
        card_token_id: cardTokenId,
    };

    const result = await preapproval.update({
        preapprovalId: gatewaySubscriptionId,
        body,
    });

    // Após a atualização, a assinatura pode voltar ao status 'authorized'
    // e o webhook de pagamento tratará a reativação da conta, se necessário.
    console.log(`[Service] Cartão da assinatura ${gatewaySubscriptionId} atualizado. Novo status: ${result.status}`);

    return result;
};

const mercadoPagoService = require('./mercadoPago.service.js');
const PLANS = require('../config/plans.config');

const createPixSubscriptionPayment = async (usuario, conta) => {
    const planoInfo = PLANS.find(p => p.name === conta.plano);
    if (!planoInfo) {
        throw new Error('Plano não encontrado nas configurações.');
    }
    
    // Assumindo que o pagamento será mensal para o PIX inicial.
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
        external_reference: conta._id.toString(), // Garante que o webhook possa encontrar a conta
    };

    const pixResult = await mercadoPagoService.createPixPayment(paymentData);

    // Retorna os dados que o front-end precisa para exibir o QR Code e o "Copia e Cola"
    return {
        paymentId: pixResult.id,
        qrCode: pixResult.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: pixResult.point_of_interaction.transaction_data.qr_code_base64,
    };
};

const cancelSubscriptionByGatewayId = async (gatewaySubscriptionId) => {
    try {
        const accessToken = mercadoPagoConfig.accessToken;
        if (!accessToken) {
            console.error('Access Token do Mercado Pago não configurado.');
            throw new Error('Access Token do Mercado Pago não configurado.');
        }

        const client = new MercadoPagoConfig({ accessToken });
        const preapproval = new PreApproval(client);

        const result = await preapproval.update({
            preapprovalId: gatewaySubscriptionId,
            body: { status: 'cancelled' },
        });

        if (result.status === 'cancelled') {
            console.log(`[Service] Assinatura do gateway ${gatewaySubscriptionId} cancelada com sucesso para prevenir duplicidade.`);
        } else {
            // Mesmo que não consiga cancelar, loga o erro mas não impede o fluxo de resposta ao usuário.
            console.error(`[Service] Falha ao cancelar a assinatura do gateway ${gatewaySubscriptionId}. Status retornado: ${result.status}`);
        }
        return { success: true, result };

    } catch (error) {
        console.error(`[Service] Erro crítico ao tentar cancelar a assinatura do gateway ${gatewaySubscriptionId}:`, error.message);
        // Não relança o erro para não quebrar o fluxo principal de resposta ao usuário.
    }
};

module.exports = {
    createSubscription,
    updateSubscriptionPriceForNewUser,
    cancelSubscription,
    cancelSubscriptionByGatewayId, // Adiciona a nova função
    upgradeSubscription,
    getSubscriptionDetails,
    updateSubscriptionCard,
    createPixSubscriptionPayment,
};
