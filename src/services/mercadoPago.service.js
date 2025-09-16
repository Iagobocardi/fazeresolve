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
                // ... (lógica existente para orçamento)
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
        const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
        const payment = new Payment(client);

        const result = await payment.create({ body: paymentData });
        return result;
    }
};
