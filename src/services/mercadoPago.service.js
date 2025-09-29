const { MercadoPagoConfig, Payment } = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js'); // Importa a configuração central
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

            // 1. Lógica de Ativação de Assinatura
            // Um pagamento de assinatura é identificado pelo campo `preapproval_id`.
            if (paymentInfo.preapproval_id && paymentInfo.status === 'approved') {
                const conta = await Conta.findById(externalReference);

                // Ativa a conta somente se ela estiver aguardando pagamento.
                // Isso evita reativar uma conta cancelada ou processar webhooks duplicados.
                if (conta && conta.statusAssinatura === 'AGUARDANDO_PAGAMENTO') {
                    conta.statusAssinatura = 'ATIVO';
                    await conta.save();
                    console.log(`[Webhook] Assinatura da conta ${conta._id} ativada com sucesso pelo pagamento ${paymentId}.`);
                } else {
                    console.log(`[Webhook] Pagamento de assinatura ${paymentId} recebido para conta ${externalReference}, mas a conta não estava aguardando pagamento. Nenhuma ação foi tomada.`);
                }
                return; // Encerra o processamento, pois já tratamos o webhook.
            }

            // 2. Lógica de Pagamento de Orçamento
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

module.exports = {
    handlePaymentNotification,
    createPixPayment: async (paymentData) => {
        try {
            const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
            const payment = new Payment(client);

            console.log("Criando cobrança PIX com os seguintes dados:", JSON.stringify(paymentData, null, 2));

            const result = await payment.create({ body: paymentData });
            return result;
        } catch (error) {
            console.error("Erro detalhado ao criar pagamento PIX no serviço:", JSON.stringify(error, null, 2));
            // Propaga o erro para ser tratado pelo controller
            throw error;
        }
    }
};
