const mercadopago = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const Orcamento = require('../models/orcamento.model');
const Conta = require('../models/conta.model');

const handlePaymentNotification = async (paymentId) => {
    try {
        mercadopago.configure({
            access_token: mercadoPagoConfig.accessToken,
        });

        const paymentInfoResult = await mercadopago.payment.get(paymentId);
        const paymentInfo = paymentInfoResult.body;

        if (paymentInfo && paymentInfo.external_reference) {
            const externalReference = paymentInfo.external_reference;

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
                    conta.gracePeriodExpiresAt = null;
                    await conta.save();
                    console.log(`[Webhook] Pagamento PIX da assinatura ${paymentId} aprovado. Conta ${conta._id} ativada.`);
                    return;
                }
            }

            // --- LÓGICA DE PAGAMENTO DE ORÇAMENTO (Existente) ---
            const orcamento = await Orcamento.findById(externalReference);
            if (orcamento) {
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
                    orcamento.statusPagamento = totalPago >= orcamento.valorProposto ? 'Pago' : 'Pago Parcial';

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

const createPixPayment = async (paymentData) => {
    try {
        mercadopago.configure({
            access_token: mercadoPagoConfig.accessToken,
        });

        console.log("Criando cobrança PIX com os seguintes dados:", JSON.stringify(paymentData, null, 2));

        const result = await mercadopago.payment.create(paymentData);
        return result.body;
    } catch (error) {
        console.error("Erro detalhado ao criar pagamento PIX no serviço:", JSON.stringify(error.response?.data || error.message, null, 2));
        throw error;
    }
};

module.exports = {
    handlePaymentNotification,
    createPixPayment,
};
