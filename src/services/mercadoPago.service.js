const { MercadoPagoConfig, Payment } = require('mercadopago');
const axios = require('axios');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const PLANS = require('../config/plans.config.js');
const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');
const Conta = require('../models/conta.model');

const handlePaymentNotification = async (paymentId) => {
    // Utiliza a configuração centralizada para garantir que o token de acesso seja carregado corretamente.
    const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
    const payment = new Payment(client);

    try {
        const paymentInfo = await payment.get({ id: paymentId });

        if (paymentInfo && paymentInfo.external_reference) {
            const externalReference = paymentInfo.external_reference;

            // --- LÓGICA DE PAGAMENTO ÚNICO (PIX OU CARTÃO) ---
            if (externalReference.includes('_') && paymentInfo.status === 'approved') {
                const [contaId, planId] = externalReference.split('_');
                
                let selectedPlan = null;
                for (const plan of PLANS) {
                    const found = plan.oneTime.find(p => p.id === planId);
                    if (found) {
                        selectedPlan = found;
                        break;
                    }
                }

                if (selectedPlan) {
                    const conta = await Conta.findById(contaId);
                    if (conta) {
                        const now = new Date();
                        // Se a conta já tiver um acesso válido, estende a partir da data existente.
                        const startDate = conta.acessoValidoAte && conta.acessoValidoAte > now ? conta.acessoValidoAte : now;
                        
                        conta.acessoValidoAte = new Date(startDate.setMonth(startDate.getMonth() + selectedPlan.months));
                        conta.statusAssinatura = 'ATIVO'; // Garante que a conta seja considerada ativa
                        await conta.save();
                        console.log(`[Webhook] Acesso da conta ${contaId} estendido por ${selectedPlan.months} meses via pagamento único.`);
                        return; // Processamento concluído
                    }
                }
            }

            // --- LÓGICA DE PAGAMENTO DE ASSINATURA (CARTÃO DE CRÉDITO RECORRENTE) ---
            if (paymentInfo.preapproval_id) {
                const conta = await Conta.findById(externalReference);
                if (!conta) {
                    console.log(`[Webhook] Conta ${externalReference} não encontrada para o pagamento de assinatura ${paymentId}.`);
                    return;
                }

                if (paymentInfo.status === 'approved') {
                    conta.statusAssinatura = 'ATIVO';
                    conta.gracePeriodExpiresAt = null;
                    await conta.save();
                    console.log(`[Webhook] Pagamento da assinatura ${paymentId} aprovado. Conta ${conta._id} está ATIVA.`);
                } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(paymentInfo.status)) {
                    if (conta.statusAssinatura === 'ATIVO') {
                        const gracePeriodHours = 72;
                        conta.statusAssinatura = 'EM_ATRASO';
                        conta.gracePeriodExpiresAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);
                        await conta.save();
                        console.log(`[Webhook] Pagamento da assinatura ${paymentId} falhou. Conta ${conta._id} em período de carência por ${gracePeriodHours} horas.`);
                    }
                }
                return;
            }

            // --- LÓGICA DE PAGAMENTO DE ASSINATURA (PIX INICIAL OU REGULARIZAÇÃO) ---
            if (paymentInfo.payment_method_id === 'pix' && paymentInfo.description?.startsWith('Pagamento da assinatura do plano')) {
                const conta = await Conta.findById(externalReference);
                if (conta && paymentInfo.status === 'approved') {
                    conta.statusAssinatura = 'ATIVO';
                    conta.gracePeriodExpiresAt = null; // Limpa o período de carência, se houver
                    await conta.save();
                    console.log(`[Webhook] Pagamento PIX da assinatura ${paymentId} aprovado. Conta ${conta._id} ativada.`);
                    return;
                }
            }

            // --- LÓGICA DE PAGAMENTO DE ORÇAMENTO (Existente) ---
            const orcamento = await Orcamento.findById(externalReference);
            if (orcamento) {
                // Evita processar pagamentos duplicados
                const pagamentoJaRegistrado = orcamento.pagamentos.some(p => p.observacao.includes(paymentInfo.id));
                if (pagamentoJaRegistrado) {
                    console.log(`[Webhook] Pagamento ${paymentInfo.id} já registrado para o orçamento ${externalReference}.`);
                    return;
                }

                if (paymentInfo.status === 'approved') {
                    orcamento.pagamentos.push({
                        valor: paymentInfo.transaction_amount,
                        metodo: 'Mercado Pago',
                        data: new Date(paymentInfo.date_approved),
                        observacao: `Pagamento online via MP. ID: ${paymentInfo.id}`
                    });

                    orcamento.historico.push({ evento: `Pagamento de R$${paymentInfo.transaction_amount.toFixed(2)} aprovado via Mercado Pago.` });

                    const totalPago = orcamento.pagamentos.reduce((acc, p) => acc + p.valor, 0);
                    if (totalPago >= orcamento.valorProposto) {
                        orcamento.statusPagamento = 'Pago';
                    } else {
                        orcamento.statusPagamento = 'Pago Parcial';
                    }

                    await orcamento.save();
                    console.log(`[Webhook] Orçamento ${externalReference} atualizado com sucesso para o pagamento ${paymentInfo.id}.`);
                }
                return;
            }

            // Se não for um orçamento, tenta encontrar uma conta
            const conta = await Conta.findById(externalReference);
            if (conta && paymentInfo.payment_method_id === 'pix' && paymentInfo.status === 'approved') {
                const description = paymentInfo.description; // Ex: "Plano Profissional - 6 Meses"
                let months = 0;
                if (description.includes('1 Mes')) months = 1;
                if (description.includes('6 Meses')) months = 6;
                if (description.includes('12 Meses')) months = 12;

                if (months > 0) {
                    const now = new Date();
                    const newExpiryDate = new Date(now.setMonth(now.getMonth() + months));
                    
                    conta.statusAssinatura = 'ATIVO';
                    conta.acessoValidoAte = newExpiryDate;
                    await conta.save();
                    console.log(`[Webhook] Acesso da conta ${conta._id} estendido por ${months} meses via Pix.`);
                }
            }
        }
    } catch (error) {
        console.error(`[MercadoPagoService] Erro ao processar notificação de pagamento ${paymentId}:`, error);
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
