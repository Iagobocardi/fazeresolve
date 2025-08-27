const { MercadoPagoConfig, Payment } = require('mercadopago');
const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');

const handlePaymentNotification = async (paymentId) => {
    // Acessa o Access Token do provedor.
    // IMPORTANTE: Em um cenário real multi-provider, o client do MP precisa ser instanciado
    // com o Access Token do provider correto, que precisaria ser identificado a partir da notificação.
    // Por simplicidade aqui, vamos assumir um único Access Token por enquanto.
    // Esta lógica precisará ser refinada quando o MP Connect for implementado.
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
    const payment = new Payment(client);

    try {
        const paymentInfo = await payment.get({ id: paymentId });

        if (paymentInfo && paymentInfo.external_reference) {
            const orcamentoId = paymentInfo.external_reference;
            const orcamento = await Orcamento.findById(orcamentoId);

            if (!orcamento) {
                console.warn(`[Webhook] Orçamento com ID ${orcamentoId} não encontrado.`);
                return;
            }

            // Evita processar pagamentos duplicados
            const pagamentoJaRegistrado = orcamento.pagamentos.some(p => p.observacao.includes(paymentInfo.id));
            if (pagamentoJaRegistrado) {
                console.log(`[Webhook] Pagamento ${paymentInfo.id} já registrado para o orçamento ${orcamentoId}.`);
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

                // Lógica para atualizar o status geral do pagamento
                const totalPago = orcamento.pagamentos.reduce((acc, p) => acc + p.valor, 0);
                if (totalPago >= orcamento.valorProposto) {
                    orcamento.statusPagamento = 'Pago';
                } else {
                    orcamento.statusPagamento = 'Pago Parcial';
                }

                await orcamento.save();
                console.log(`[Webhook] Orçamento ${orcamentoId} atualizado com sucesso para o pagamento ${paymentInfo.id}.`);
            }
        }
    } catch (error) {
        console.error(`[MercadoPagoService] Erro ao processar notificação de pagamento ${paymentId}:`, error);
    }
};

module.exports = {
    handlePaymentNotification,
};
