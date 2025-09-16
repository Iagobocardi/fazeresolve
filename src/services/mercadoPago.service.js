const { MercadoPagoConfig, Payment } = require('mercadopago');
const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');

const Conta = require('../models/conta.model');

const handlePaymentNotification = async (paymentId) => {
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
    const payment = new Payment(client);

    try {
        const paymentInfo = await payment.get({ id: paymentId });

        if (paymentInfo && paymentInfo.external_reference) {
            const externalReference = paymentInfo.external_reference;

            // Tenta encontrar um orçamento primeiro
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
        console.log('[mercadoPagoService] Criando pagamento Pix com os dados:', paymentData);
        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
        const payment = new Payment(client);

        const result = await payment.create({ body: paymentData });
        console.log('[mercadoPagoService] Resposta da API do Mercado Pago:', result);
        return result;
    }
};
