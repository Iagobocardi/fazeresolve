const mongoose = require('mongoose');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const axios = require('axios');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const PLANS = require('../config/plans.config.js');
const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');
const Conta = require('../models/conta.model');

const handlePaymentNotification = async (paymentId) => {
    const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
    const payment = new Payment(client);

    try {
        const paymentInfo = await payment.get({ id: paymentId });
        if (!paymentInfo || !paymentInfo.external_reference) {
            console.log(`[Webhook] Notificação de pagamento ${paymentId} recebida sem referência externa.`);
            return;
        }

        const { external_reference, status } = paymentInfo;

        // 1. LÓGICA DE PAGAMENTO DE ASSINATURA RECORRENTE (tem `preapproval_id`)
        if (paymentInfo.preapproval_id) {
            const conta = await Conta.findById(external_reference);
            if (!conta) return console.log(`[Webhook] Conta de assinatura ${external_reference} não encontrada.`);

            if (status === 'approved') {
                conta.statusAssinatura = 'ATIVO';
                conta.gracePeriodExpiresAt = null;
                await conta.save();
                console.log(`[Webhook] Assinatura da conta ${conta._id} renovada.`);
            } else if (['rejected', 'cancelled'].includes(status) && conta.statusAssinatura === 'ATIVO') {
                const gracePeriodHours = 72;
                conta.statusAssinatura = 'EM_ATRASO';
                conta.gracePeriodExpiresAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);
                await conta.save();
                console.log(`[Webhook] Falha na renovação da assinatura da conta ${conta._id}. Período de carência iniciado.`);
            }
            return;
        }

        // 2. LÓGICA DE PAGAMENTO ÚNICO (tem `_` na referência)
        if (external_reference.includes('_') && status === 'approved') {
            const [contaId, planId] = external_reference.split('_');
            const selectedPlan = PLANS.flatMap(p => p.oneTime).find(p => p.id === planId);

            if (selectedPlan) {
                const conta = await Conta.findById(contaId);
                if (conta) {
                    const now = new Date();
                    const startDate = conta.acessoValidoAte && conta.acessoValidoAte > now ? conta.acessoValidoAte : now;
                    conta.acessoValidoAte = new Date(new Date(startDate).setMonth(startDate.getMonth() + selectedPlan.months));
                    conta.statusAssinatura = 'ATIVO';
                    await conta.save();
                    console.log(`[Webhook] Acesso da conta ${contaId} estendido por ${selectedPlan.months} meses.`);
                    return;
                }
            }
        }

        // 3. LÓGICA DE PAGAMENTO DE ORÇAMENTO (é um ObjectId válido)
        if (mongoose.Types.ObjectId.isValid(external_reference)) {
            const orcamento = await Orcamento.findById(external_reference);
            if (orcamento && status === 'approved') {
                const pagamentoJaRegistrado = orcamento.pagamentos.some(p => p.observacao.includes(paymentId));
                if (pagamentoJaRegistrado) return console.log(`[Webhook] Pagamento ${paymentId} já registrado para o orçamento ${external_reference}.`);

                orcamento.pagamentos.push({
                    valor: paymentInfo.transaction_amount,
                    metodo: 'Mercado Pago',
                    data: new Date(paymentInfo.date_approved),
                    observacao: `Pagamento online via MP. ID: ${paymentId}`
                });

                const totalPago = orcamento.pagamentos.reduce((acc, p) => acc + p.valor, 0);
                orcamento.statusPagamento = totalPago >= orcamento.valorProposto ? 'Pago' : 'Pago Parcial';
                orcamento.historico.push({ evento: `Pagamento de R$${paymentInfo.transaction_amount.toFixed(2)} aprovado via Mercado Pago.` });
                
                await orcamento.save();
                console.log(`[Webhook] Orçamento ${external_reference} atualizado com o pagamento ${paymentId}.`);
                return;
            }
        }

    } catch (error) {
        console.error(`[MercadoPagoService] Erro crítico ao processar notificação de pagamento ${paymentId}:`, error);
    }
};

/**
 * Cria a URL de autorização OAuth para que os vendedores conectem suas contas do Mercado Pago.
 * @param {string} state - Um valor único para manter o estado entre a requisição e o callback (usaremos o contaId).
 * @param {string} redirectUri - A URL de callback para onde o Mercado Pago deve redirecionar após a autorização.
 * @returns {string} A URL de autorização completa.
 */
const createConnectionUrl = async (state, redirectUri) => {
    const appId = mercadoPagoConfig.appId;
    if (!appId) {
        throw new Error("MP_APP_ID não está configurado nas variáveis de ambiente.");
    }

    const baseUrl = "https://auth.mercadopago.com.br/authorization";
    const params = new URLSearchParams({
        client_id: appId,
        response_type: 'code',
        platform_id: 'mp',
        state: state,
        redirect_uri: redirectUri,
    });

    return `${baseUrl}?${params.toString()}`;
};

/**
 * Troca um código de autorização temporário por tokens de acesso permanentes.
 * @param {string} code - O código de autorização recebido do callback do Mercado Pago.
 * @param {string} redirectUri - A mesma URI de redirecionamento usada na etapa de autorização.
 * @returns {object} As credenciais do Mercado Pago (accessToken, refreshToken, publicKey, userId, expiresAt).
 */
const exchangeCodeForTokens = async (code, redirectUri) => {
    const { clientSecret, appId } = mercadoPagoConfig;
    if (!clientSecret || !appId) {
        throw new Error("Credenciais da aplicação (MERCADO_PAGO_CLIENT_SECRET ou MP_APP_ID) não configuradas.");
    }

    const url = "https://api.mercadopago.com/oauth/token";

    const body = {
        client_secret: mercadoPagoConfig.clientSecret,
        client_id: appId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
    };

    try {
        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const { data } = response;
        const expiresAt = new Date(Date.now() + data.expires_in * 1000);

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            publicKey: data.public_key,
            userId: data.user_id.toString(),
            expiresAt: expiresAt,
        };
    } catch (error) {
        console.error("Erro ao trocar código por tokens no Mercado Pago:", error.response?.data || error.message);
        throw new Error("Falha ao obter credenciais do Mercado Pago.");
    }
};

module.exports = {
    handlePaymentNotification,
    createConnectionUrl,
    exchangeCodeForTokens,
    createPixPayment: async (paymentData) => {
        const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
        const payment = new Payment(client);
        try {
            console.log("Criando cobrança PIX com os seguintes dados:", JSON.stringify(paymentData, null, 2));
            const result = await payment.create({ body: paymentData });
            return result;
        } catch (error) {
            console.error("Erro detalhado ao criar pagamento PIX no serviço:", error?.cause ?? error.message);
            throw new Error("Falha ao criar cobrança PIX no Mercado Pago.");
        }
    },
};
